'use strict'
const searchRoute = module.exports = { }

const async = require('async')
const filter = require('../filter')
const pagination = require('../pagination')

searchRoute.register = (privateData, helper, postProcess) => {
    privateData.router.bindRoute({
        verb: 'get',
        path: ':type'
    }, (request, resourceConfig, res) => {
        let searchResults
        let response
        let paginationInfo

        async.waterfall([
            callback => {
                helper.verifyRequest(request, resourceConfig, res, 'search', callback)
            },
            callback => {
                helper.validate(request.params, resourceConfig.searchParams, callback)
            },
            function parseAndValidateFilter (callback) {
                return callback(filter.parseAndValidate(request))
            },
            function validatePaginationParams (callback) {
                pagination.validatePaginationParams(request)
                return callback()
            },
            callback => {
                resourceConfig.handlers.search(request, callback)
            },
            function enforcePagination (results, pageInfo, callback) {
                searchResults = pagination.enforcePagination(request, results)
                paginationInfo = pageInfo
                return callback()
            },
            callback => {
                postProcess.fetchForeignKeys(request, searchResults, resourceConfig.attributes, callback)
            },
            callback => {
                privateData.responseHelper._enforceSchemaOnArray(searchResults, resourceConfig.attributes, callback)
            },
            (sanitisedData, callback) => {
                response = privateData.responseHelper._generateResponse(request, resourceConfig, sanitisedData, paginationInfo)
                response.included = [ ]
                postProcess.handle(request, response, callback)
            }
        ], err => {
            if (err) return helper.handleError(request, res, err)
            return privateData.router.sendResponse(res, response, 200)
        })
    })
}
