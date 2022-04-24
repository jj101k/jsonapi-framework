"use strict"

const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class ForeignKeySearchRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/relationships/?"
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

            const [results] = await this.handlers(resourceConfig).search(request)

            const searchResults = results[0] ? {id: results[0].id, type: results[0].type} : null
            const response = {
                ...this.responseHelper._generateResponse(request, resourceConfig, searchResults),
                included: [],
            }
            await this.postProcess.handle(request, response)
            return this.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = ForeignKeySearchRoute