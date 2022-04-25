"use strict"
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class UpdateRelationRoute extends BaseRoute {
    routeSpec = {
        verb: "patch",
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

        const relationName = request.params.relation
        const change = {
            id: request.params.id,
            type: request.params.type,
            [relationName]: request.params.data,
        }
        const validator = {
            id: resourceConfig.onCreate.id,
            type: resourceConfig.onCreate.type,
        }
        if(resourceConfig.onCreate[relationName]) {
            validator[relationName] = resourceConfig.onCreate[relationName]
        }
        await this.validate(change, validator)
        await update(request, change)
        const [newResource] = await find(request)
        this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)

        const sanitisedData = await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)

        return sanitisedData.relationships[relationName].data
    }
}

module.exports = UpdateRelationRoute