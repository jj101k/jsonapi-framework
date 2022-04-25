"use strict"
const filter = require("../../filter")
const pagination = require("../../pagination")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class searchRoute extends BaseRoute {
    routeSpec = {
        verb: "get",
        path: ":type"
    }

    generateResponse(request, resourceConfig, rawResponse) {
        const [sanitisedData, paginationInfo] = rawResponse
        return {
            ...this.responseHelper._generateResponse(request, resourceConfig, sanitisedData, paginationInfo),
            included: [],
        }
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {search} = this.assertGetValidRequestHandlers(request, resourceConfig, "search")
        await this.helper.validate(request.params, resourceConfig.searchParams)
        filter.parseAndAssertValid(request)
        const err = pagination.validatePaginationParams(request)
        if(err) {
            throw err
        }

        const [results, paginationInfo] = await search(request)

        const searchResults = pagination.enforcePagination(request, results)
        this.postProcess.fetchForeignKeys(request, searchResults, resourceConfig.attributes)

        const sanitisedData = await this.responseHelper._enforceSchemaOnArray(searchResults, resourceConfig.attributes)
        return [sanitisedData, paginationInfo]
    }
}

module.exports = searchRoute