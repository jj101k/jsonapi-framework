"use strict"

const OurJoi = require("../../OurJoi")
const SchemaHelper = require("../../SchemaHelper")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class AddRelationRoute extends BaseRoute {
    routeSpec = {
        verb: "post",
        path: ":type/:id/relationships/:relation"
    }

    successCode = 201

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find, update} = this.assertGetValidRequestHandlers(request, resourceConfig, "find", "update")

        const newRelation = request.params.data
        const relationName = request.params.relation

        const [exitingResource] = await find(request)

        const existingResourceClone = JSON.parse(JSON.stringify(exitingResource))

        const modifiedResource = SchemaHelper.forOptional(resourceConfig.attributes[relationName])?.isToManyRelationship ?
            {
                ...existingResourceClone,
                [relationName]: [...(existingResourceClone[relationName] || []), newRelation]
            } :
            {
                ...existingResourceClone,
                [relationName]: newRelation,
            }

        await this.validate(modifiedResource, resourceConfig.onCreate)
        await update(request, modifiedResource)
        const [storedResource] = await find(request)

        this.postProcess.fetchForeignKeys(storedResource, resourceConfig.attributes)
        const sanitisedResource = await this.responseHelper._enforceSchemaOnObject(storedResource, OurJoi.object(resourceConfig.attributes))
        return this.generateResponse(request, sanitisedResource.relationships[relationName].data)
    }
}

module.exports = AddRelationRoute