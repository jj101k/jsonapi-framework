"use strict"

const JsonAPIError = require("../../JsonAPIError")
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
        return this.helper.handleError(request, res, new JsonAPIError(
            "404",
            "EINVALID",
            "Invalid Route",
            "This is not the API you are looking for?"
        ))
    }
}

module.exports = z404Route