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

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {search} = this.assertGetValidRequestHandlers(request, resourceConfig, "search")
        await this.helper.validate(request.params, resourceConfig.searchParams)
        const err = filter.parseAndValidate(request)
        if(err) {
            throw err
        }
        const err2 = pagination.validatePaginationParams(request)
        if(err2) {
            throw err2
        }

        const [results, paginationInfo] = await search(request)

        const searchResults = pagination.enforcePagination(request, results)
        this.postProcess.fetchForeignKeys(request, searchResults, resourceConfig.attributes)

        const sanitisedData = await this.responseHelper._enforceSchemaOnArray(searchResults, resourceConfig.attributes)
        const response = {
            ...this.responseHelper._generateResponse(request, resourceConfig, sanitisedData, paginationInfo),
            included: [],
        }
        await this.postProcess.handle(request, response)
        return this.sendResponse(res, response, 200)
    }
}

module.exports = searchRoute