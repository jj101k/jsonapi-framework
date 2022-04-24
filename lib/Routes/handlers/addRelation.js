"use strict"

const BaseRoute = require("../BaseRoute")

class addRelationRoute extends BaseRoute {
    routeSpec = {
        verb: "post",
        path: ":type/:id/relationships/:relation"
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async handler(request, resourceConfig, res) {
        try {
            const {find, update} = this.assertGetValidRequestHandlers(request, resourceConfig, "find", "update")

            this.helper.assertHasBody(request)

            const [ourResource] = await find(request)

            const theirs = request.params.data
            const theirResourceIn = JSON.parse(JSON.stringify(ourResource))
            const theirResource = {
                ...theirResourceIn,
                [request.params.relation]: resourceConfig.attributes[request.params.relation]._settings.__many ?
                    [...(theirResourceIn[request.params.relation] || []), theirs] :
                    theirs
            }

            await this.helper.validate(theirResource, resourceConfig.onCreate)
            await update(request, theirResource)
            const [newResource] = await find(request)

            this.postProcess.fetchForeignKeys(request, newResource, resourceConfig.attributes)
            const sanitisedData = await this.responseHelper._enforceSchemaOnObject(newResource, resourceConfig.attributes)
            const response = this.responseHelper._generateResponse(request, resourceConfig,
                sanitisedData.relationships[request.params.relation].data)
            await this.postProcess.handle(request, response)
            this.sendResponse(res, response, 201)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = addRelationRoute