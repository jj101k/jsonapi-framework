"use strict"

const BaseRoute = require("../BaseRoute")

/**
 *
 */
class updateRoute extends BaseRoute {
    routeSpec = {
        verb: "patch",
        path: ":type/:id"
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

            const theirs = request.params.data
            const theirResource = {
                id: request.params.id,
                type: request.params.type,
                ...theirs.attributes,
                meta: theirs.meta,
                ...Object.fromEntries(
                    Object.entries(theirs.relationships || {}).map(([i, r]) => [i, r.data])
                )
            }

            const validationObject = Object.fromEntries(
                Object.entries(resourceConfig.onCreate).filter(([k, v]) => k in theirResource)
            )
            await this.helper.validate(theirResource, validationObject)

            const rcHandlers = this.handlers(resourceConfig)
            await rcHandlers.update(request, theirResource)
            const [newResource] = await rcHandlers.find(request)
            this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)

            const sanitisedData = await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)

            const response = this.responseHelper._generateResponse(request, resourceConfig, sanitisedData)
            await this.postProcess.handle(request, response)
            await this.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = updateRoute