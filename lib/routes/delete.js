'use strict'
const deleteRoute = module.exports = { }

const async = require('async')

deleteRoute.register = (privateData, helper) => {
    privateData.router.bindRoute({
        verb: 'delete',
        path: ':type/:id'
    }, (request, resourceConfig, res) => {
        async.waterfall([
            callback => {
                helper.verifyRequest(request, resourceConfig, res, 'delete', callback)
            },
            callback => {
                resourceConfig.handlers.delete(request, callback)
            }
        ], err => {
            if (err) return helper.handleError(request, res, err)

            const response = {
                meta: privateData.responseHelper._generateMeta(request)
            }
            privateData.router.sendResponse(res, response, 200)
        })
    })
}
