"use strict"

const JsonAPIError = require("../../JsonAPIError")
const BaseError = require("../BaseError")

/**
 *
 */
class NotFoundRoute extends BaseError {
    bind() {
        this.router.bind404(this.boundHandler)
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("express").Response} res
     */
    async handler(request, res) {
        return this.handleError(request, res, new JsonAPIError(
            "404",
            "EINVALID",
            "Invalid Route",
            "This is not the API you are looking for?"
        ))
    }
}

module.exports = NotFoundRoute