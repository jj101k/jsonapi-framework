"use strict"

const JsonAPIError = require("../../JsonAPIError")
const SchemaHelper = require("../../SchemaHelper")
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

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {search} = this.assertGetValidRequestHandlers(request, resourceConfig, "search")
        const foreignKey = Object.keys(request.params).reverse().filter(
            param => !RelationshipGetRoute.NonForeignKeyParams.includes(param)
        )[0]

        const foreignKeySchema = resourceConfig.attributes[foreignKey]
        const helper = SchemaHelper.forOptional(foreignKeySchema)
        if (!helper?.isRelationship) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid foreign key lookup",
                `Relation [${foreignKey}] does not exist within ${request.params.type}`
            )
        }
        if (!helper.isRelationship) {
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

        const rawResponse = results[0] ? {id: results[0].id, type: results[0].type} : null
        return {
            ...this.responseHelper._generateResponse(request, rawResponse),
            included: []
        }
    }
}

module.exports = RelationshipGetRoute