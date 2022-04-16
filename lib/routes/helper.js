"use strict"
const Joi = require("joi")
const debug = require("../debugging")
const JsonAPIError = require("../JsonAPIError")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")

/**
 *
 */
class helperClass extends RetainsJsonApiPrivate {
    /**
     *
     * @param {import("express").Request} request
     * @returns
     */
    assertHasBody(request) {
        if (!request.params.data) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Request validation failed",
                "Missing \"data\" - have you sent the right http headers?"
            )
        }
        // data can be {} or [] both of which are typeof === 'object'
        if (typeof request.params.data !== "object") {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Request validation failed",
                "\"data\" must be an object - have you sent the right http headers?"
            )
        }
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("express").Response} res
     * @param {*} err
     * @returns
     */
    handleError(request, res, err) {
        const errorResponse = this.privateData.responseHelper.generateError(request, err)
        const httpCode = errorResponse.errors[0].status || 500
        return this.privateData.router.sendResponse(res, errorResponse, httpCode)
    }

    /**
     *
     * @param {*} someObject
     * @param {*} someDefinition
     */
    async validate(someObject, someDefinition) {
        debug.validationInput(JSON.stringify(someObject))
        try {
            const sanitisedObject = await Joi.validate(someObject, someDefinition, {abortEarly: false})
            Object.assign(someObject, sanitisedObject)
        } catch(err) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Param validation failed",
                err.details
            )
        }
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     * @param {string} handlerRequest
     * @throws
     * @returns
     */
    verifyRequest(request, resourceConfig, res, handlerRequest) {
        if (!resourceConfig) {
            throw new JsonAPIError(
                "404",
                "ENOTFOUND",
                "Resource not found",
                `The requested resource '${request.params.type}' does not exist`
            )
        }

        if (!resourceConfig.handlers.ready) {
            throw new JsonAPIError(
                "503",
                "EUNAVAILABLE",
                "Resource temporarily unavailable",
                `The requested resource '${request.params.type}' is temporarily unavailable`
            )
        }

        // for crud operation support, we need skip over any ChainHandlers to check what the actual store supports
        let finalHandler = resourceConfig.handlers
        while (finalHandler.otherHandler) {
            finalHandler = finalHandler.otherHandler
        }

        if (!finalHandler[handlerRequest]) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Resource not supported",
                `The requested resource '${request.params.type}' does not support '${handlerRequest}'`
            )
        }
    }
}

module.exports = helperClass