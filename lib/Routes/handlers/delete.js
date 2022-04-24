"use strict"

const BaseRoute = require("../BaseRoute")

/**
 *
 */
class deleteRoute extends BaseRoute {
    routeSpec = {
        verb: "delete",
        path: ":type/:id"
    }

    generateResponse(request, resourceConfig, rawResponse) {
        return rawResponse
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

        return {
            meta: this.responseHelper._generateMeta(request)
        }
    }
}

module.exports = deleteRoute