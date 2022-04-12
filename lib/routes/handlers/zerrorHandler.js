"use strict"

const BaseError = require("../BaseError")

/**
 *
 */
class zerrorHandlerRoute extends BaseError {
    bind() {
        this.privateData.router.bindErrorHandler(this.handler.bind(this))
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("express").Response} res
     * @param {*} error
     */
    async handler(request, res, error) {
        if (this.jsonApi._errHandler) {
            this.jsonApi._errHandler(request, error)
        }

        return this.helper.handleError(request, res, {
            status: "500",
            code: "EUNKNOWN",
            title: "An unknown error has occured. Sorry?",
            detail: "??"
        })
    }
}

module.exports = zerrorHandlerRoute