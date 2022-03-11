'use strict'
const fourOhFour = module.exports = { }

const helper = require('./helper')
const router = require('../router')

fourOhFour.register = () => {
    router.bind404((request, res) => helper.handleError(request, res, {
        status: '404',
        code: 'EINVALID',
        title: 'Invalid Route',
        detail: 'This is not the API you are looking for?'
    }))
}
