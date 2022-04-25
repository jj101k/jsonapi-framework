/**
 * @typedef {import("../router")} router
 * @typedef {import("../jsonApi")} jsonApi
 */

const BasePseudoRoute = require("./BasePseudoRoute")

/**
 * @abstract
 */
class BaseError extends BasePseudoRoute {
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
     * @param {jsonApiPrivate} privateData
     * @param {router} router
     * @param {jsonApi} jsonApi
     */
    constructor(privateData, router, jsonApi) {
        super(privateData)
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