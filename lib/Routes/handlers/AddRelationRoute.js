"use strict"

const BaseRoute = require("../BaseRoute")

/**
 *
 */
class AddRelationRoute extends BaseRoute {
    routeSpec = {
        verb: "post",
        path: ":type/:id/relationships/:relation"
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find, update} = this.assertGetValidRequestHandlers(request, resourceConfig, "find", "update")

        this.helper.assertHasBody(request)

        const newRelation = request.params.data
        const relationName = request.params.relation

        const [exitingResource] = await find(request)

        const existingResourceClone = JSON.parse(JSON.stringify(exitingResource))

        const modifiedResource = resourceConfig.attributes[relationName]._settings.__many ?
            {
                ...existingResourceClone,
                [relationName]: [...(existingResourceClone[relationName] || []), newRelation]
            } :
            {
                ...existingResourceClone,
                [relationName]: newRelation,
            }

        await this.helper.validate(modifiedResource, resourceConfig.onCreate)
        await update(request, modifiedResource)
        const [storedResource] = await find(request)

        this.postProcess.fetchForeignKeys(request, storedResource, resourceConfig.attributes)
        const sanitisedResource = await this.responseHelper._enforceSchemaOnObject(storedResource, resourceConfig.attributes)
        const response = this.responseHelper._generateResponse(request, resourceConfig,
            sanitisedResource.relationships[relationName].data)
        await this.postProcess.handle(request, response)
        this.sendResponse(res, response, 201)
    }
}

module.exports = AddRelationRoute