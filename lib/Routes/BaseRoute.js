const ChainHandler = require("../handlers/ChainHandler")
const {chainObjectToPromise} = require("../handlers/ChainHandler")
const JsonAPIError = require("../JsonAPIError")

/**
 * @abstract
 */
class BaseRoute {
    /**
     * @type {import("./helper")}
     */
    helper

    /**
     * @type {import("../jsonApi")}
     */
    jsonApi

    /**
     * @type {import("../postProcess")}
     */
    postProcess

    /**
     * @type {import("../jsonApiPrivate")}
     */
    privateData

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
     * @param {import("../jsonApiPrivate")} privateData
     * @param {import("./helper")} helper
     * @param {import("../postProcess")} postProcess
     * @param {import("../jsonApi")} jsonApi
     */
    constructor(privateData, helper, postProcess, jsonApi) {
        this.helper = helper
        this.jsonApi = jsonApi
        this.postProcess = ChainHandler.chainObjectToPromise(postProcess, "handle")
        this.privateData = privateData
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
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

        const handlers = chainObjectToPromise(resourceConfig.handlers, "create", "delete", "find", "search", "update")
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
     * @param {Express.Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {any} rawResponse
     * @returns
     */
    generateResponse(request, resourceConfig, rawResponse) {
        return this.responseHelper._generateResponse(request, resourceConfig, rawResponse)
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {ReturnType<import("../jsonApiPrivate")["responseHelper"]["_generateResponse"]>} response
     */
    handlePostProcess(request, response) {
        return this.postProcess.handle(request, response)
    }

    /**
     * @abstract
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     * @returns {Promise<any>}
     */
    async handler(request, resourceConfig, res) {
        let response
        try {
            const rawResponse = await this.throwableHandler(request, resourceConfig, res)
            response = this.generateResponse(request, resourceConfig, rawResponse)
            await this.handlePostProcess(request, response)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
        this.router.sendResponse(res, response, this.successCode)
    }

    /**
     * @abstract
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     * @returns {Promise<ReturnType<import("../jsonApiPrivate")["responseHelper"]["_generateResponse"]>>}
     */
    throwableHandler(request, resourceConfig, res) {
        throw new Error("Not implemented")
    }
}

module.exports = BaseRoute