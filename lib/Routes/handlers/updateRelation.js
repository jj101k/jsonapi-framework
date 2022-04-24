"use strict"
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class updateRelationRoute extends BaseRoute {
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

        const theirResource = {
            id: request.params.id,
            type: request.params.type,
            [request.params.relation]: request.params.data,
        }
        const validator = {
            id: resourceConfig.onCreate.id,
            type: resourceConfig.onCreate.type,
        }
        if(resourceConfig.onCreate[request.params.relation]) {
            validator[request.params.relation] = resourceConfig.onCreate[request.params.relation]
        }
        await this.helper.validate(theirResource, validator)
        await update(request, theirResource)
        const [newResource] = await find(request)
        this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)

        const sanitisedData = await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)

        return sanitisedData.relationships[request.params.relation].data
    }
}

module.exports = updateRelationRoute