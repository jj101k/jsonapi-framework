'use strict'
const errorHandler = module.exports = { }

errorHandler.register = (privateData, helper, postProcess, jsonApi) => {
    privateData.router.bindErrorHandler((request, res, error) => {
        if (jsonApi._errHandler) {
            jsonApi._errHandler(request, error)
        }

        return helper.handleError(request, res, {
            status: '500',
            code: 'EUNKNOWN',
            title: 'An unknown error has occured. Sorry?',
            detail: '??'
        })
    })
}
