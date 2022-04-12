"use strict"
const {chainObjectToPromise} = require("../../handlers/ChainHandler")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class relationshipsRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: "get",
            path: ":type/:id/relationships/:relation"
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
            this.helper.verifyRequest(request, resourceConfig, res, "find")
            const relation = resourceConfig.attributes[request.params.relation]
            if (!relation || !(relation._settings.__one || relation._settings.__many)) {
                throw {
                    status: "404",
                    code: "ENOTFOUND",
                    title: "Resource not found",
                    detail: "The requested relation does not exist within the requested type"
                }
            }

            const rcHandlers = chainObjectToPromise(resourceConfig.handlers, "find")
            const [resource] = await rcHandlers.find(request)
            this.postProcess.fetchForeignKeys(request, resource, resourceConfig.attributes)

            const sanitisedData = await this.responseHelper._enforceSchemaOnObject(resource, resourceConfig.attributes)

            if (!sanitisedData) {
                throw {
                    status: "404",
                    code: "EVERSION",
                    title: "Resource is not valid",
                    detail: "The requested resource does not conform to the API specification. This is usually the result of a versioning change."
                }
            }
            const relationshipData = sanitisedData.relationships[request.params.relation].data
            const response = this.responseHelper._generateResponse(request, resourceConfig, relationshipData)
            return this.privateData.router.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = relationshipsRoute