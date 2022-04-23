const ChainHandler = require("../handlers/ChainHandler")

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
     * @type {import("../jsonApiPrivate")["responseHelper"]}
     */
    responseHelper

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
        this.responseHelper = privateData.responseHelper
    }

    /**
     * @abstract
     */
    bind() {
        throw new Error("Not implemented")
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
}

module.exports = BaseRoute