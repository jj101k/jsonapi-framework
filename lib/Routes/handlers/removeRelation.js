"use strict"
const {chainObjectToPromise} = require("../../handlers/ChainHandler")
const JsonAPIError = require("../../JsonAPIError")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class removeRelationRoute extends BaseRoute {
    routeSpec = {
        verb: "delete",
        path: ":type/:id/relationships/:relation"
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
            const [theirResource] = await rcHandlers.find(request)

            const isMany = resourceConfig.attributes[request.params.relation]._settings.__many
            const isOne = resourceConfig.attributes[request.params.relation]._settings.__one
            const relationType = isMany || isOne
            const theirs = Array.isArray(request.params.data) ?
                request.params.data :
                [request.params.data]

            const existingRelations = Array.isArray(theirResource[request.params.relation]) ?
                theirResource[request.params.relation] :
                [theirResource[request.params.relation]]
            const keys = existingRelations.map(j => j.id)

            for (const relation of theirs) {
                if (!relationType.includes(relation.type)) {
                    throw new JsonAPIError(
                        "403",
                        "EFORBIDDEN",
                        "Invalid Request",
                        `Invalid type ${relation.type}`
                    )
                }
                const indexOfTheirs = keys.indexOf(relation.id)
                if (indexOfTheirs === -1) {
                    throw new JsonAPIError(
                        "403",
                        "EFORBIDDEN",
                        "Invalid Request",
                        `Unknown id ${relation.id}`
                    )
                }
                if (isMany) {
                    theirResource[request.params.relation].splice(indexOfTheirs, 1)
                }
            }

            if (!isMany) {
                theirResource[request.params.relation] = null
            }

            await this.helper.validate(theirResource, resourceConfig.onCreate)

            await rcHandlers.update(request, theirResource)

            const [newResource] = await rcHandlers.find(request)
            this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)

            const sanitisedData =
                await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)

            const relationshipData = sanitisedData.relationships[request.params.relation].data
            const response = this.responseHelper._generateResponse(request, resourceConfig, relationshipData)
            await this.postProcess.handle(request, response)

            return this.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = removeRelationRoute