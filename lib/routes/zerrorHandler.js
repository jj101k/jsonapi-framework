'use strict'
const errorHandler = module.exports = { }

const jsonApi = require('../jsonApi')
const helper = require('./helper')
const router = require('../router')

errorHandler.register = () => {
    router.bindErrorHandler((request, res, error) => {
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
