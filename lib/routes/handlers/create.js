"use strict"
const uuid = require("uuid")
const BaseRoute = require("../BaseRoute")
const {chainObjectToPromise} = require("../../handlers/ChainHandler")

/**
 *
 */
class createRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: "post",
            path: ":type"
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
            this.helper.verifyRequest(request, resourceConfig, res, "create")
            this.helper.verifyRequest(request, resourceConfig, res, "find")
            this.helper.assertHasBody(request)

            const theirs = request.params.data

            // Take id from client if provided, but not for autoincrement
            const id = theirs.id || (
                request.resourceConfig.primaryKey === "autoincrement" ?
                    "DEFAULT" :
                    (request.resourceConfig.primaryKey === "uuid" ? uuid.v4() : null)
            )
            const theirResource = {
                type: request.params.type,
                ...(id ? {id} : {}),
                ...theirs.attributes,
                meta: theirs.meta,
                ...Object.fromEntries(
                    Object.entries(theirs.relationships || {}).map(([i, r]) => [i, r.data])
                )
            }

            await this.helper.validate(theirResource, resourceConfig.onCreate)

            const rcHandlers = chainObjectToPromise(resourceConfig.handlers, "create", "find")
            const [createdResource] = await rcHandlers.create(request, theirResource)

            request.params.id = createdResource.id
            const [newResource] = await rcHandlers.find(request)

            this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)

            const sanitisedData = await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)

            request.route.path += `/${newResource.id}`
            res.set({
                Location: `${request.route.combined}/${newResource.id}`,
            })
            const response = this.responseHelper._generateResponse(request, resourceConfig, sanitisedData)

            await this.postProcess.handle(request, response)
            return this.privateData.router.sendResponse(res, response, 201)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = createRoute