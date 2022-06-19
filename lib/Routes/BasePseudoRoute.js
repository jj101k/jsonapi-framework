/**
 * @typedef {import("../jsonApiPrivate")} jsonApiPrivate
 */

/**
 * @abstract
 */
class BasePseudoRoute {
    /**
     * @type {jsonApiPrivate}
     */
    privateData

    /**
     *
     * @param {jsonApiPrivate} privateData
     */
    constructor(privateData) {
        this.privateData = privateData
    }

    /**
     *
     * @param {import("../../types/Handler").JsonApiRequest} request
     * @param {import("express").Response} res
     * @param {*} err
     * @returns
     */
    handleError(request, res, err) {
        const errorResponse = this.privateData.responseHelper.generateError(request, err)
        const httpCode = errorResponse.errors[0].status || 500
        return this.privateData.router.sendResponse(res, errorResponse, httpCode)
    }
}

module.exports = BasePseudoRoute