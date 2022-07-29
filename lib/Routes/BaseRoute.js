const ChainHandler = require("../handlers/ChainHandler")
const JsonAPIError = require("../JsonAPIError")
const BasePseudoRoute = require("./BasePseudoRoute")
const debug = require("../debugging")
const OurJoi = require("../OurJoi")
const SchemaHelper = require("../SchemaHelper")

/**
 * @typedef {import("../../types/Handler").JsonApiRequest} JsonApiRequest
 */

/**
 * @typedef {import("../jsonApi")} jsonApi
 * @typedef {import("../jsonApiPrivate")} jsonApiPrivate
 * @typedef {import("../postProcess")} postProcess
 * @typedef {import("../../types/jsonApi").ResourceConfig} ResourceConfig
 */

/**
 * @typedef {ReturnType<jsonApiPrivate["responseHelper"]["_generateResponse"]>} JsonApiResponse
 */

/**
 * @abstract
 */
class BaseRoute extends BasePseudoRoute {
    /**
     * @type {jsonApi}
     */
    jsonApi

    /**
     * @type {postProcess}
     */
    postProcess

    /**
     * @abstract
     * @type {{verb: string, path: string}}
     */
    routeSpec

    /**
     *
     */
    successCode = 200

    /**
     *
     */
    get responseHelper() {
        return this.privateData.responseHelper
    }

    /**
     *
     */
    get router() {
        return this.privateData.router
    }

    /**
     *
     * @param {jsonApiPrivate} privateData
     * @param {postProcess} postProcess
     * @param {jsonApi} jsonApi
     */
    constructor(privateData, postProcess, jsonApi) {
        super(privateData)
        this.jsonApi = jsonApi
        this.postProcess = ChainHandler.chainObjectToPromise(postProcess, "handle")
        this.privateData = privateData
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {ResourceConfig} resourceConfig
     * @param {string[]} requestTypes
     * @throws
     * @returns The handlers to use
     */
    assertGetValidRequestHandlers(request, resourceConfig, ...requestTypes) {
        if (!resourceConfig) {
            throw new JsonAPIError(
                "404",
                "ENOTFOUND",
                "Resource not found",
                `The requested resource '${request.params.type}' does not exist`
            )
        }

        if (!resourceConfig.handlers.ready) {
            throw new JsonAPIError(
                "503",
                "EUNAVAILABLE",
                "Resource temporarily unavailable",
                `The requested resource '${request.params.type}' is temporarily unavailable`
            )
        }

        // for crud operation support, we need skip over any ChainHandlers to check what the actual store supports
        let finalHandler = resourceConfig.handlers
        while (finalHandler.otherHandler) {
            finalHandler = finalHandler.otherHandler
        }
        const missingTypes = requestTypes.filter(requestType => !finalHandler[requestType])
        if (missingTypes.length > 0) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Resource not supported",
                `The requested resource '${request.params.type}' does not support: ${missingTypes}`
            )
        }

        if(["post", "patch"].includes(this.routeSpec.verb)) {
            if (!request.params.data) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Request validation failed",
                    "Missing \"data\" - have you sent the right http headers?"
                )
            }
            // data can be {} or [] both of which are typeof === 'object'
            if (typeof request.params.data !== "object") {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Request validation failed",
                    "\"data\" must be an object - have you sent the right http headers?"
                )
            }
        }

        const handlers = ChainHandler.chainObjectToPromise(resourceConfig.handlers, "create", "delete", "find", "search", "update")
        /**
         * @type {{[key: string]: Function}}
         */
        const wrapper = {}
        for(const requestType of requestTypes) {
            wrapper[requestType] = handlers[requestType]
        }
        return wrapper
    }

    /**
     * Binds this class to the router
     */
    bind() {
        this.router.bindRoute(this.routeSpec, this.handler.bind(this))
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {{[key: string]: any}} data
     * @returns {JsonApiResponse}
     */
    generateResponse(request, data) {
        return this.responseHelper._generateResponse(request, data)
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {JsonApiResponse} response
     * @returns {Promise<any> | any}
     */
    handlePostProcess(request, response) {
        return this.postProcess.handle(request, response)
    }

    /**
     * @abstract
     *
     * @param {JsonApiRequest} request
     * @param {ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     * @returns {Promise<any>}
     */
    async handler(request, resourceConfig, res) {
        let response
        try {
            response = await this.throwableHandler(request, resourceConfig, res)
            await this.handlePostProcess(request, response)
        } catch(err) {
            return this.handleError(request, res, err)
        }
        this.router.sendResponse(res, response, this.successCode)
    }

    /**
     * @abstract
     *
     * @param {JsonApiRequest} request
     * @param {ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     * @returns {Promise<JsonApiResponse>}
     */
    throwableHandler(request, resourceConfig, res) {
        throw new Error("Not implemented")
    }

    /**
     *
     * @param {{[key: string]: any}} someObject
     * @param {{[key: string]: import("joi").Schema}} someDefinition
     */
    async validate(someObject, someDefinition) {
        debug.validationInput(JSON.stringify(someObject))
        const schema = OurJoi.object(someDefinition)
        try {
            const validationResult = SchemaHelper.for(schema).validate(someObject, {abortEarly: false})
            if(validationResult.error) {
                throw validationResult.error
            }
            Object.assign(someObject, validationResult.value)
        } catch(err) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Param validation failed",
                err.details
            )
        }
    }
}

module.exports = BaseRoute