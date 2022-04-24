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

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async handler(request, resourceConfig, res) {
        try {
            this.verifyRequest(request, resourceConfig, "find")
            const err = filter.parseAndValidate(request)
            if(err) {
                throw err
            }
            const [resource] = await this.handlers(resourceConfig).find(request)
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
            const response = this.responseHelper._generateResponse(request, resourceConfig, sanitisedData)
            response.included = []
            await this.postProcess.handle(request, response)
            return this.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = findRoute