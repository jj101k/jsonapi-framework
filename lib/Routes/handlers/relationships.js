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
     * @param {ReturnType<import("../jsonApiPrivate")["responseHelper"]["_generateResponse"]>} response
     */
    handlePostProcess(request, response) {
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
        return this.responseHelper._generateResponse(request, resourceConfig, relationshipData)
    }
}

module.exports = relationshipsRoute