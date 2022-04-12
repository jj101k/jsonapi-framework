"use strict"

const BaseRoute = require("../BaseRoute")
const {chainObjectToPromise} = require("../../handlers/ChainHandler")

class addRelationRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: "post",
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
            this.helper.verifyRequest(request, resourceConfig, res, "update")
            this.helper.verifyRequest(request, resourceConfig, res, "find")

            this.helper.assertHasBody(request)

            const rcHandlers = chainObjectToPromise(resourceConfig.handlers, "find", "update")

            const [ourResource] = await rcHandlers.find(request)

            const theirs = request.params.data
            const theirResourceIn = JSON.parse(JSON.stringify(ourResource))
            const theirResource = {
                ...theirResourceIn,
                [request.params.relation]: resourceConfig.attributes[request.params.relation]._settings.__many ?
                    [...(theirResourceIn[request.params.relation] || []), theirs] :
                    theirs
            }

            await this.helper.validate(theirResource, resourceConfig.onCreate)
            await rcHandlers.update(request, theirResource)
            const [newResource] = await rcHandlers.find(request)

            this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)
            const sanitisedData = await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)
            const response = this.responseHelper._generateResponse(request, resourceConfig,
                sanitisedData.relationships[request.params.relation].data)
            await this.postProcess.handle(request, response)
            this.privateData.router.sendResponse(res, response, 201)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = addRelationRoute