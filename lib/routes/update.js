'use strict'
const updateRoute = module.exports = { }

const async = require('async')

updateRoute.register = (privateData, helper, postProcess) => {
    privateData.router.bindRoute({
        verb: 'patch',
        path: ':type/:id'
    }, (request, resourceConfig, res) => {
        let theirResource
        let newResource
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
                theirResource = {
                    id: request.params.id,
                    type: request.params.type,
                    ...theirs.attributes,
                    meta: theirs.meta,
                }
                for (const i in theirs.relationships) {
                    theirResource[i] = theirs.relationships[i].data
                }
                callback()
            },
            callback => {
                const validationObject = Object.fromEntries(
                    Object.entries(resourceConfig.onCreate).filter(([k, v]) => k in theirResource)
                )
                helper.validate(theirResource, validationObject, callback)
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
                response = privateData.responseHelper._generateResponse(request, resourceConfig, sanitisedData)
                postProcess.handle(request, response, callback)
            }
        ], err => {
            if (err) return helper.handleError(request, res, err)
            privateData.router.sendResponse(res, response, 200)
        })
    })
}
