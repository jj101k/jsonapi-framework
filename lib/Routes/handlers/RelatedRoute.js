"use strict"
const JsonAPIError = require("../../JsonAPIError")
const pagination = require("../../pagination")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class RelatedRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id/:relation"
    }

    generateResponse(request, resourceConfig, rawResponse) {
        const [relatedResources, total] = rawResponse
        if (relatedResources !== null) {
            return {
                ...this.responseHelper._generateResponse(request, resourceConfig, relatedResources, total),
                included: [],
            }
        } else {
            return this.responseHelper._generateResponse(request, resourceConfig, relatedResources, total)
        }
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find} = this.assertGetValidRequestHandlers(request, resourceConfig, "find")
        const relation = resourceConfig.attributes[request.params.relation]
        if (!relation?._settings?.__one && !relation?._settings?.__many) {
            throw new JsonAPIError(
                "404",
                "ENOTFOUND",
                "Resource not found",
                "The requested relation does not exist within the requested type"
            )
        }
        if (relation._settings.__as) {
            throw new JsonAPIError(
                "404",
                "EFOREIGN",
                "Relation is Foreign",
                "The requested relation is a foreign relation and cannot be accessed in this manner."
            )
        }
        pagination.validatePaginationParams(request)
        const [mainResource] = await find(request)

        request.resourceConfig = (relation._settings.__one || relation._settings.__many).map(
            resourceName => this.jsonApi._resources[resourceName]
        )
        if(relation._settings.__one) {
            const [[firstResource]] = await this.postProcess._fetchRelatedResources(request, mainResource)
            return [firstResource, null] // if this is a hasOne, then disable pagination meta data.
        } else {
            return this.postProcess._fetchRelatedResources(request, mainResource)
        }
    }
}

module.exports = RelatedRoute