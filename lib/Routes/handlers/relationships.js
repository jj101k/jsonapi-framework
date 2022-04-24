"use strict"
const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class relationshipsRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id/relationships/:relation"
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async handler(request, resourceConfig, res) {
        try {
            const {find} = this.assertGetValidRequestHandlers(request, resourceConfig, "find")
            const relation = resourceConfig.attributes[request.params.relation]
            if (!relation || !(relation._settings.__one || relation._settings.__many)) {
                throw new JsonAPIError(
                    "404",
                    "ENOTFOUND",
                    "Resource not found",
                    "The requested relation does not exist within the requested type"
                )
            }

            const [resource] = await find(request)
            this.postProcess.fetchForeignKeys(request, resource, resourceConfig.attributes)

            const sanitisedData = await this.responseHelper._enforceSchemaOnObject(resource, resourceConfig.attributes)

            if (!sanitisedData) {
                throw new JsonAPIError(
                    "404",
                    "EVERSION",
                    "Resource is not valid",
                    "The requested resource does not conform to the API specification. This is usually the result of a versioning change."
                )
            }
            const relationshipData = sanitisedData.relationships[request.params.relation].data
            const response = this.responseHelper._generateResponse(request, resourceConfig, relationshipData)
            return this.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = relationshipsRoute