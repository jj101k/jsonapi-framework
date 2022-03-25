'use strict'
const filter = require('../../filter')
const { chainObjectToPromise } = require('../../handlers/ChainHandler')
const pagination = require('../../pagination')
const BaseRoute = require('../BaseRoute')

/**
 *
 */
class searchRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: 'get',
            path: ':type'
        }, this.handler.bind(this))
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async handler(request, resourceConfig, res) {
        try {
            this.helper.verifyRequest(request, resourceConfig, res, 'search')
            await this.helper.validate(request.params, resourceConfig.searchParams)
            const err = filter.parseAndValidate(request)
            if(err) {
                throw err
            }
            const err2 = pagination.validatePaginationParams(request)
            if(err2) {
                throw err2
            }

            const rcHandlers = chainObjectToPromise(resourceConfig.handlers, "search")

            const [results, paginationInfo] = await rcHandlers.search(request)

            const searchResults = pagination.enforcePagination(request, results)
            this.postProcess.fetchForeignKeys(request, searchResults, resourceConfig.attributes)

            const sanitisedData = await this.responseHelper._enforceSchemaOnArray(searchResults, resourceConfig.attributes)
            const response = {
                ...this.responseHelper._generateResponse(request, resourceConfig, sanitisedData, paginationInfo),
                included: [],
            }
            await this.postProcess.handle(request, response)
            return this.privateData.router.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = searchRoute