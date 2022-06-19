"use strict"
const JsonAPIError = require("../../JsonAPIError")
const OurJoi = require("../../OurJoi")
const SchemaHelper = require("../../SchemaHelper")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class RemoveRelationRoute extends BaseRoute {
    routeSpec = {
        verb: "delete",
        path: ":type/:id/relationships/:relation"
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find, update} = this.assertGetValidRequestHandlers(request, resourceConfig, "find", "update")

        const [storedEntity] = await find(request)

        const relationName = request.params.relation

        let relationType
        const helper = SchemaHelper.for(resourceConfig.attributes[relationName])
        if(helper.isRelationship) {
            relationType = helper.relationTypeCodes
        }
        const relations = Array.isArray(request.params.data) ?
            request.params.data :
            [request.params.data]

        const existingRelations = Array.isArray(storedEntity[relationName]) ?
            storedEntity[relationName] :
            [storedEntity[relationName]]
        const existingRelationIdentities = existingRelations.map(j => j.id)

        for (const relation of relations) {
            if (!relationType.includes(relation.type)) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid Request",
                    `Invalid type ${relation.type}`
                )
            }
            const indexOfTheirs = existingRelationIdentities.indexOf(relation.id)
            if (indexOfTheirs === -1) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid Request",
                    `Unknown id ${relation.id}`
                )
            }
            if (helper.isToManyRelationship) {
                storedEntity[relationName].splice(indexOfTheirs, 1)
            }
        }

        if (!helper.isToManyRelationship) {
            storedEntity[relationName] = null
        }

        await this.validate(storedEntity, resourceConfig.onCreate)

        await update(request, storedEntity)

        const [newResource] = await find(request)
        this.postProcess.fetchForeignKeys(newResource, resourceConfig.attributes)

        const sanitisedData =
            await this.responseHelper._enforceSchemaOnObject(newResource, OurJoi.object(resourceConfig.attributes))

        return sanitisedData.relationships[relationName].data
    }
}

module.exports = RemoveRelationRoute