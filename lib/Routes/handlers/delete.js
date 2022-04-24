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
    async handler(request, resourceConfig, res) {
        try {
            const {delete: handleDelete} = this.assertGetValidRequestHandlers(request, resourceConfig, "delete")
            await handleDelete(request)

            const response = {
                meta: this.responseHelper._generateMeta(request)
            }
            this.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = deleteRoute