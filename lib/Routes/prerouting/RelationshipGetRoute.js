"use strict"

const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class RelationshipGetRoute extends BaseRoute {
    /**
     *
     */
    static NonForeignKeyParams = ["include", "type", "sort", "filter", "fields", "requestId"]

    routeSpec = {
        verb: "get",
        path: ":type/relationships/?"
    }

    generateResponse(request, resourceConfig, rawResponse) {
        return {
            ...this.responseHelper._generateResponse(request, resourceConfig, rawResponse),
            included: []
        }
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {search} = this.assertGetValidRequestHandlers(request, resourceConfig, "search")
        const foreignKey = Object.keys(request.params).reverse().filter(
            param => !RelationshipGetRoute.NonForeignKeyParams.includes(param)
        )[0]

        const foreignKeySchema = resourceConfig.attributes[foreignKey]
        if (!foreignKeySchema?._settings) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid foreign key lookup",
                `Relation [${foreignKey}] does not exist within ${request.params.type}`
            )
        }
        if (!foreignKeySchema._settings.__one && !foreignKeySchema._settings.__many) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid foreign key lookup",
                `Attribute [${foreignKey}] does not represent a relation within ${request.params.type}`
            )
        }

        const params = {
            ...request.params,
            [foreignKey]: request.params[foreignKey],
        }
        delete params[foreignKey]

        request.params = params

        const [results] = await search(request)

        return results[0] ? {id: results[0].id, type: results[0].type} : null
    }
}

module.exports = RelationshipGetRoute