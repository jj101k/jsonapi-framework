"use strict"

const filter = require("../../filter")
const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class findRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id"
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
        const {find} = this.assertGetValidRequestHandlers(request, resourceConfig, "find")
        filter.parseAndAssertValid(request)
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
        return sanitisedData
    }
}

module.exports = findRoute