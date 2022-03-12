'use strict'
const createRoute = module.exports = { }

const async = require('async')
const _ = {
    assign: require('lodash.assign')
}
const uuid = require('uuid')

createRoute.register = (privateData, helper, postProcess) => {
    privateData.router.bindRoute({
        verb: 'post',
        path: ':type'
    }, (request, resourceConfig, res) => {
        let theirResource
        let newResource
        let response

        async.waterfall([
            callback => {
                helper.verifyRequest(request, resourceConfig, res, 'create', callback)
            },
            callback => {
                helper.verifyRequest(request, resourceConfig, res, 'find', callback)
            },
            callback => {
                helper.checkForBody(request, callback)
            },
            callback => {
                const theirs = request.params.data
                theirResource = _.assign(
                    { type: request.params.type },
                    (request.resourceConfig.primaryKey === 'uuid') && { id: uuid.v4() },
                    (request.resourceConfig.primaryKey === 'autoincrement') && { id: 'DEFAULT' },
                    theirs.id && { id: theirs.id }, // Take id from client if provided, but not for autoincrement
                    theirs.attributes,
                    { meta: theirs.meta }
                )
                for (const i in theirs.relationships) {
                    theirResource[i] = theirs.relationships[i].data
                }
                helper.validate(theirResource, resourceConfig.onCreate, callback)
            },
            callback => {
                resourceConfig.handlers.create(request, theirResource, callback)
            },
            (result, callback) => {
                newResource = result
                request.params.id = newResource.id
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
                request.route.path += `/${newResource.id}`
                res.set({
                    'Location': `${request.route.combined}/${newResource.id}`
                })
                response = privateData.responseHelper._generateResponse(request, resourceConfig, sanitisedData)
                postProcess.handle(request, response, callback)
            }
        ], err => {
            if (err) return helper.handleError(request, res, err)
            return privateData.router.sendResponse(res, response, 201)
        })
    })
}
