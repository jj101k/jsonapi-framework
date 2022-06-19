"use strict"
const filter = require("../../filter")
const OurJoi = require("../../OurJoi")
const pagination = require("../../pagination")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class SearchRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type"
    }

    generateResponse(request, rawResponse) {
        const [sanitisedData, paginationInfo] = rawResponse
        return {
            ...this.responseHelper._generateResponse(request, sanitisedData, paginationInfo),
            included: [],
        }
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {search} = this.assertGetValidRequestHandlers(request, resourceConfig, "search")
        await this.validate(request.params, resourceConfig.searchParams)
        filter.parseAndAssertValid(request)
        pagination.retainPaginationParams(request)

        const [results, paginationInfo] = await search(request)

        const searchResults = pagination.enforcePagination(request, results)
        this.postProcess.fetchForeignKeys(searchResults, resourceConfig.attributes)

        const sanitisedData = await this.responseHelper._enforceSchemaOnArray(searchResults, OurJoi.object(resourceConfig.attributes))
        return [sanitisedData, paginationInfo]
    }
}

module.exports = SearchRoute