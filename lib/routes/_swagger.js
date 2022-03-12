'use strict'
const swagger = module.exports = { }

const swaggerClass = require('../swagger')

swagger.register = (privateData, helper, postProcess, jsonApi) => {
    if (!jsonApi._apiConfig.swagger) return
    const swaggerGenerator = new swaggerClass(jsonApi._resources, jsonApi._apiConfig)

    privateData.router.bindRoute({
        verb: 'get',
        path: 'swagger.json'
    }, (request, resourceConfig, res) => {
        if (!swagger._cache) {
            swagger._cache = swaggerGenerator.generateDocumentation()
        }

        return res.json(swagger._cache)
    })
}
