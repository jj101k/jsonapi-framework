'use strict'
const updateRelationRoute = module.exports = { }

const async = require('async')
const _ = {
    assign: require('lodash.assign'),
    pick: require('lodash.pick')
}

updateRelationRoute.register = (privateData, helper, postProcess) => {
    privateData.router.bindRoute({
        verb: 'patch',
        path: ':type/:id/relationships/:relation'
    }, (request, resourceConfig, res) => {
        let newResource
        let theirResource
        let response

        async.waterfall([
            callback => {
                helper.verifyRequest(request, resourceConfig, res, 'update', callback)
            },
            callback => {
                helper.verifyRequest(request, resourceConfig, res, 'find', callback)
            },
            callback => {
                helper.checkForBody(request, callback)
            },
            callback => {
                const theirs = request.params.data
                theirResource = _.assign({
                    id: request.params.id,
                    type: request.params.type
                })
                theirResource[request.params.relation] = theirs
                const validator = _.pick(resourceConfig.onCreate, [ 'id', 'type', request.params.relation ])
                helper.validate(theirResource, validator, callback)
            },
            callback => {
                resourceConfig.handlers.update(request, theirResource, callback)
            },
            (result, callback) => {
                resourceConfig.handlers.find(request, callback)
            },
            (result, callback) => {
                newResource = result
                postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes, callback)
            },
            callback => {
                privateData.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes, callback)
            },
            (sanitisedData, callback) => {
                sanitisedData = sanitisedData.relationships[request.params.relation].data
                response = privateData.responseHelper._generateResponse(request, resourceConfig, sanitisedData)
                postProcess.handle(request, response, callback)
            }
        ], err => {
            if (err) return helper.handleError(request, res, err)
            privateData.router.sendResponse(res, response, 200)
        })
    })
}
