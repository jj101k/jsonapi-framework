"use strict"
const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class RelationshipsRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id/relationships/:relation"
    }

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
        const relationName = request.params.relation
        const relation = resourceConfig.attributes[relationName]
        if (!relation?._settings?.__one && !relation?._settings?.__many) {
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

        return sanitisedData.relationships[relationName].data
    }
}

module.exports = RelationshipsRoute