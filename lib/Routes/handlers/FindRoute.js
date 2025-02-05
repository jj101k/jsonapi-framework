"use strict"

const filter = require("../../filter")
const OurJoi = require("../../OurJoi")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class FindRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type/:id"
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find} = this.assertGetValidRequestHandlers(request, resourceConfig, "find")
        filter.parseAndAssertValid(request)
        const [resource] = await find(request)
        this.postProcess.fetchForeignKeys(resource, resourceConfig.attributes)

        return {
            ...this.responseHelper._generateResponse(request,
                await this.responseHelper._enforceSchemaOnObject(resource, OurJoi.object(resourceConfig.attributes))),
            included: []
        }
    }
}

module.exports = FindRoute