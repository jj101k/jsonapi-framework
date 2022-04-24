const ChainHandler = require("../handlers/ChainHandler")
const {chainObjectToPromise} = require("../handlers/ChainHandler")

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
}

module.exports = BaseRoute