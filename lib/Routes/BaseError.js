/**
 * @abstract
 */
class BaseError {
    /**
     * @type {import("./helper")}
     */
    helper

    /**
     * @type {import("../jsonApi")}
     */
    jsonApi

    /**
     * @type {import("../jsonApiPrivate")}
     */
    privateData

    /**
     *
     * @param {import("../jsonApiPrivate")} privateData
     * @param {import("./helper")} helper
     * @param {import("../jsonApi")} jsonApi
     */
    constructor(privateData, helper, jsonApi) {
        this.helper = helper
        this.jsonApi = jsonApi
        this.privateData = privateData
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
     * @param {import("express").Response} res
     * @returns {Promise<any>}
     */
    handler(request, res) {
        throw new Error("Not implemented")
    }
}

module.exports = BaseError