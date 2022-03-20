'use strict'
const { chainObjectToPromise } = require('../../handlers/ChainHandler')
const pagination = require('../../pagination')
const BaseRoute = require('../BaseRoute')


/**
 *
 */
class relatedRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: 'get',
            path: ':type/:id/:relation'
        }, this.handler.bind(this))
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async handler(request, resourceConfig, res) {
        try {
            this.helper.verifyRequest(request, resourceConfig, res, 'find')
            const relation = resourceConfig.attributes[request.params.relation]
            if (!relation || !relation._settings || !(relation._settings.__one || relation._settings.__many)) {
                throw {
                    status: '404',
                    code: 'ENOTFOUND',
                    title: 'Resource not found',
                    detail: 'The requested relation does not exist within the requested type'
                }
            }
            if (relation._settings.__as) {
                throw {
                    status: '404',
                    code: 'EFOREIGN',
                    title: 'Relation is Foreign',
                    detail: 'The requested relation is a foreign relation and cannot be accessed in this manner.'
                }
            }
            pagination.validatePaginationParams(request)
            const rcHandlers = chainObjectToPromise(resourceConfig.handlers, "find")
            const [mainResource] = await rcHandlers.find(request)
            const [discoveredRelatedResources, discoveredTotal] = await this.postProcess._fetchRelatedResources(request, mainResource)

            let relatedResources
            let total
            if (relation._settings.__one) {
                // if this is a hasOne, then disable pagination meta data.
                total = null
                relatedResources = discoveredRelatedResources[0]
            } else {
                total = discoveredTotal
                relatedResources = discoveredRelatedResources
            }
            request.resourceConfig = (relation._settings.__one || relation._settings.__many).map(resourceName => {
                return this.jsonApi._resources[resourceName]
            })

            const response = this.responseHelper._generateResponse(request, resourceConfig, relatedResources, total)
            if (relatedResources !== null) {
                response.included = []
            }

            await this.postProcess.handle(request, response)

            return this.privateData.router.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = relatedRoute