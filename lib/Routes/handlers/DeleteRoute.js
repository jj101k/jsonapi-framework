"use strict"

const BaseRoute = require("../BaseRoute")

/**
 *
 */
class DeleteRoute extends BaseRoute {
    routeSpec = {
        verb: "delete",
        path: ":type/:id"
    }

    handlePostProcess(request, response) {
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {delete: handleDelete} = this.assertGetValidRequestHandlers(request, resourceConfig, "delete")
        await handleDelete(request)

        return {
            meta: this.responseHelper._generateMeta(request)
        }
    }
}

module.exports = DeleteRoute