"use strict"

const OurJoi = require("../../OurJoi")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class UpdateRoute extends BaseRoute {
    routeSpec = {
        verb: "patch",
        path: ":type/:id"
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {find, update} = this.assertGetValidRequestHandlers(request, resourceConfig, "find", "update")

        const changes = request.params.data
        const entityChanges = {
            id: request.params.id,
            type: request.params.type,
            ...changes.attributes,
            meta: changes.meta,
            ...Object.fromEntries(
                Object.entries(changes.relationships || {}).map(([i, r]) => [i, r.data])
            )
        }

        const validationObject = Object.fromEntries(
            Object.entries(resourceConfig.onCreate).filter(([k]) => k in entityChanges)
        )
        await this.validate(entityChanges, validationObject)

        await update(request, entityChanges)
        const [newResource] = await find(request)
        this.postProcess.fetchForeignKeys(newResource, resourceConfig.attributes)

        return this.responseHelper._enforceSchemaOnObject(newResource, OurJoi.object(resourceConfig.attributes))
    }
}

module.exports = UpdateRoute