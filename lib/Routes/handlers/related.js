"use strict"
const JsonAPIError = require("../../JsonAPIError")
const pagination = require("../../pagination")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class relatedRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id/:relation"
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
        if (!relation || !relation._settings || !(relation._settings.__one || relation._settings.__many)) {
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
        const [discoveredRelatedResources, discoveredTotal] = await this.postProcess._fetchRelatedResources(request, mainResource)

        let relatedResources
        let total
        if (relation._settings.__one) {
            // if this is a hasOne, then disable pagination meta data.
            total = null
            relatedResources = discoveredRelatedResources[0]
        } else {
            total = discoveredTotal
            relatedResources = discoveredRelatedResources
        }
        request.resourceConfig = (relation._settings.__one || relation._settings.__many).map(resourceName => {
            return this.jsonApi._resources[resourceName]
        })

        const response = this.responseHelper._generateResponse(request, resourceConfig, relatedResources, total)
        if (relatedResources !== null) {
            response.included = []
        }

        await this.postProcess.handle(request, response)

        return this.sendResponse(res, response, 200)
    }
}

module.exports = relatedRoute