"use strict"

const BaseError = require("../BaseError")

/**
 *
 */
class z404Route extends BaseError {
    bind() {
        this.privateData.router.bind404(this.handler.bind(this))
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("express").Response} res
     */
    async handler(request, res) {
        return this.helper.handleError(request, res, {
            status: "404",
            code: "EINVALID",
            title: "Invalid Route",
            detail: "This is not the API you are looking for?"
        })
    }
}

module.exports = z404Route