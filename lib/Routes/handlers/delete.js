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

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    async throwableHandler(request, resourceConfig, res) {
        const {delete: handleDelete} = this.assertGetValidRequestHandlers(request, resourceConfig, "delete")
        await handleDelete(request)

        const response = {
            meta: this.responseHelper._generateMeta(request)
        }
        return response
    }
}

module.exports = deleteRoute