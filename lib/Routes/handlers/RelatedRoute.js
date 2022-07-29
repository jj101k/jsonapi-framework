"use strict"
const JsonAPIError = require("../../JsonAPIError")
const pagination = require("../../pagination")
const SchemaHelper = require("../../SchemaHelper")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class RelatedRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id/:relation"
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find} = this.assertGetValidRequestHandlers(request, resourceConfig, "find")
        const relation = resourceConfig.attributes[request.params.relation]
        const helper = SchemaHelper.forOptional(relation)
        if (!helper?.isRelationship) {
            throw new JsonAPIError(
                "404",
                "ENOTFOUND",
                "Resource not found",
                "The requested relation does not exist within the requested type"
            )
        }
        if (helper.isBelongsToRelationship) {
            throw new JsonAPIError(
                "404",
                "EFOREIGN",
                "Relation is Foreign",
                "The requested relation is a foreign relation and cannot be accessed in this manner."
            )
        }
        pagination.retainPaginationParams(request)
        const [mainResource] = await find(request)

        request.resourceConfig = helper.relationTypes.map(
            resourceName => this.jsonApi._resources[resourceName]
        )
        let relatedResources
        let total
        if(helper.isToOneRelationship) {
            const [[firstResource]] = await this.postProcess._fetchRelatedResources(request, mainResource)
            relatedResources = firstResource
            total = null
            // if this is a hasOne, then disable pagination meta data.
        } else {
            [relatedResources, total] = await this.postProcess._fetchRelatedResources(request, mainResource)
        }

        if (relatedResources !== null) {
            return {
                ...this.responseHelper._generateResponse(request, relatedResources, total),
                included: [],
            }
        } else {
            return this.responseHelper._generateResponse(request, relatedResources, total)
        }
    }
}

module.exports = RelatedRoute