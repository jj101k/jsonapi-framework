/**
 * @typedef {import("../router")} router
 * @typedef {import("../jsonApi")} jsonApi
 * @typedef {import("./helper")} helper
 */

/**
 * @abstract
 */
class BaseError {
    /**
     * @type {helper}
     */
    helper

    /**
     * @type {jsonApi}
     */
    jsonApi

    /**
     * @type {router}
     */
    router

    /**
     *
     */
    get boundHandler() {
        return this.handler.bind(this)
    }

    /**
     *
     * @param {router} router
     * @param {helper} helper
     * @param {jsonApi} jsonApi
     */
    constructor(router, helper, jsonApi) {
        this.helper = helper
        this.jsonApi = jsonApi
        this.router = router
    }

    /**
     * Binds this object to the router
     *
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