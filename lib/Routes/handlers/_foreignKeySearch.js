"use strict"

const {ChainHandler} = require("../../jsonApi")
const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class foreignKeySearchRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: "get",
            path: ":type/relationships/?"
        }, this.handler.bind(this))
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async handler(request, resourceConfig, res) {
        try {
            this.helper.verifyRequest(request, resourceConfig, res, "search")
            const NonForeignKeyParams = ["include", "type", "sort", "filter", "fields", "requestId"]
            const foreignKey = Object.keys(request.params).reverse().filter(param => !NonForeignKeyParams.includes(param))[0]

            const foreignKeySchema = resourceConfig.attributes[foreignKey]
            if (!foreignKeySchema || !foreignKeySchema._settings) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid foreign key lookup",
                    `Relation [${foreignKey}] does not exist within ${request.params.type}`
                )
            }
            if (!(foreignKeySchema._settings.__one || foreignKeySchema._settings.__many)) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid foreign key lookup",
                    `Attribute [${foreignKey}] does not represent a relation within ${request.params.type}`
                )
            }

            request.params.relationships = {
                [foreignKey]: request.params[foreignKey]
            }
            delete request.params[foreignKey]

            const rcHandlers = ChainHandler.chainObjectToPromise(resourceConfig.handlers, "search")

            const [results] = await rcHandlers.search(request)

            const searchResults = results[0] ? {id: results[0].id, type: results[0].type} : null
            const response = {
                ...this.privateData.responseHelper._generateResponse(request, resourceConfig, searchResults),
                included: [],
            }
            await this.postProcess.handle(request, response)
            return this.privateData.router.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = foreignKeySearchRoute