'use strict'
const addRelationRoute = module.exports = { }

const async = require('async')

addRelationRoute.register = (privateData, helper, postProcess) => {
    privateData.router.bindRoute({
        verb: 'post',
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
                resourceConfig.handlers.find(request, callback)
            },
            (ourResource, callback) => {
                theirResource = JSON.parse(JSON.stringify(ourResource))

                const theirs = request.params.data

                if (resourceConfig.attributes[request.params.relation]._settings.__many) {
                    theirResource[request.params.relation] = theirResource[request.params.relation] || [ ]
                    theirResource[request.params.relation].push(theirs)
                } else {
                    theirResource[request.params.relation] = theirs
                }

                helper.validate(theirResource, resourceConfig.onCreate, callback)
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
            privateData.router.sendResponse(res, response, 201)
        })
    })
}
