"use strict"
const Joi = require("joi")
const debug = require("../debugging")
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
            throw {
                status: "403",
                code: "EFORBIDDEN",
                title: "Request validation failed",
                detail: "Missing \"data\" - have you sent the right http headers?"
            }
        }
        // data can be {} or [] both of which are typeof === 'object'
        if (typeof request.params.data !== "object") {
            throw {
                status: "403",
                code: "EFORBIDDEN",
                title: "Request validation failed",
                detail: "\"data\" must be an object - have you sent the right http headers?"
            }
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
            throw {
                status: "403",
                code: "EFORBIDDEN",
                title: "Param validation failed",
                detail: err.details
            }
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
            throw {
                status: "404",
                code: "ENOTFOUND",
                title: "Resource not found",
                detail: `The requested resource '${request.params.type}' does not exist`
            }
        }

        if (!resourceConfig.handlers.ready) {
            throw {
                status: "503",
                code: "EUNAVAILABLE",
                title: "Resource temporarily unavailable",
                detail: `The requested resource '${request.params.type}' is temporarily unavailable`
            }
        }

        // for crud operation support, we need skip over any ChainHandlers to check what the actual store supports
        let finalHandler = resourceConfig.handlers
        while (finalHandler.otherHandler) {
            finalHandler = finalHandler.otherHandler
        }

        if (!finalHandler[handlerRequest]) {
            throw {
                status: "403",
                code: "EFORBIDDEN",
                title: "Resource not supported",
                detail: `The requested resource '${request.params.type}' does not support '${handlerRequest}'`
            }
        }
    }
}

module.exports = helperClass