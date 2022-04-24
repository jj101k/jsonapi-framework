"use strict"
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
    async throwableHandler(request, resourceConfig, res) {
        const {find, update} = this.assertGetValidRequestHandlers(request, resourceConfig, "find", "update")
        this.helper.assertHasBody(request)

        const [theirResource] = await find(request)

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

        await update(request, theirResource)

        const [newResource] = await find(request)
        this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)

        const sanitisedData =
            await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)

        const relationshipData = sanitisedData.relationships[request.params.relation].data
        const response = this.responseHelper._generateResponse(request, resourceConfig, relationshipData)
        await this.postProcess.handle(request, response)

        return response
    }
}

module.exports = removeRelationRoute