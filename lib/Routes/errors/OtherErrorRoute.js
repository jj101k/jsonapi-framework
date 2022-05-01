"use strict"

const JsonAPIError = require("../../JsonAPIError")
const BaseError = require("../BaseError")

/**
 *
 */
class OtherErrorRoute extends BaseError {
    /**
     *
     */
    static order = 1

    bind() {
        this.router.bindErrorHandler(this.boundHandler)
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("express").Response} res
     * @param {*} error
     */
    async handler(request, res, error = null) {
        if (this.jsonApi._errHandler) {
            this.jsonApi._errHandler(request, error)
        }

        return this.handleError(request, res, new JsonAPIError(
            "500",
            "EUNKNOWN",
            "An unknown error has occured. Sorry?",
            "??"
        ))
    }
}

module.exports = OtherErrorRoute