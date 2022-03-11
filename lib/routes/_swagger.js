'use strict'
const swagger = module.exports = { }

const router = require('../router')
const swaggerGenerator = require('../swagger')
const jsonApi = require('../../')

swagger.register = () => {
    if (!jsonApi._apiConfig.swagger) return

    router.bindRoute({
        verb: 'get',
        path: 'swagger.json'
    }, (request, resourceConfig, res) => {
        if (!swagger._cache) {
            swagger._cache = swaggerGenerator.generateDocumentation()
        }

        return res.json(swagger._cache)
    })
}
