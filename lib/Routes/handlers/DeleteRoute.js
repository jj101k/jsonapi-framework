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

    generateResponse(request, resourceConfig, rawResponse) {
        return {
            meta: this.responseHelper._generateMeta(request)
        }
    }

    handlePostProcess(request, response) {
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {delete: handleDelete} = this.assertGetValidRequestHandlers(request, resourceConfig, "delete")
        await handleDelete(request)

        return null
    }
}

module.exports = DeleteRoute