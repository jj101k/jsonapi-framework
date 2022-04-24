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
     * Binds this class to the router
     */
    bind() {
        this.router.bindRoute(this.routeSpec, this.handler.bind(this))
    }

    /**
     * @abstract
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     * @returns {Promise<any>}
     */
    handler(request, resourceConfig, res) {
        throw new Error("Not implemented")
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @returns
     */
    handlers(resourceConfig) {
        return chainObjectToPromise(resourceConfig.handlers, "create", "delete", "find", "search", "update")
    }

    /**
     *
     * @param {express.Response & {_request: import("express").Request, _startDate: Date}} res
     * @param {*} payload
     * @param {number} httpCode
     */
    sendResponse(res, payload, httpCode) {
        return this.router.sendResponse(res, payload, httpCode)
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string[]} requestTypes
     * @throws
     * @returns
     */
    verifyRequest(request, resourceConfig, ...requestTypes) {
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
    }
}

module.exports = BaseRoute