"use strict"
const uuid = require("uuid")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class CreateRoute extends BaseRoute {
    routeSpec = {
        verb: "post",
        path: ":type"
    }

    successCode = 201

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {create, find} = this.assertGetValidRequestHandlers(request, resourceConfig, "create", "find")

        const newResourceIn = request.params.data
        const type = request.params.type

        // Take id from client if provided, but not for autoincrement
        /**
         * @type {{type: string, id?: string}}
         */
        let identity
        if(newResourceIn.id) {
            identity = {type, id: newResourceIn.id}
        } else if(request.resourceConfig.primaryKey === "autoincrement") {
            identity = {type, id: "DEFAULT"}
        } else if(request.resourceConfig.primaryKey === "uuid") {
            identity = {type, id: uuid.v4()}
        } else {
            identity = {type}
        }
        const newResource = {
            ...identity,
            ...newResourceIn.attributes,
            meta: newResourceIn.meta,
            ...Object.fromEntries(
                Object.entries(newResourceIn.relationships || {}).map(([i, r]) => [i, r.data])
            )
        }

        await this.helper.validate(newResource, resourceConfig.onCreate)

        const [createdResource] = await create(request, newResource)

        const [storedResource] = await find({...request, params: {...request.params, id: createdResource.id}})

        this.postProcess.fetchForeignKeys(request, storedResource, resourceConfig.attributes)

        const sanitisedData = await this.responseHelper._enforceSchemaOnObject(storedResource, resourceConfig.attributes)

        request.route.path += `/${storedResource.id}`
        res.set({
            Location: `${request.route.combined}/${storedResource.id}`,
        })
        return sanitisedData
    }
}

module.exports = CreateRoute