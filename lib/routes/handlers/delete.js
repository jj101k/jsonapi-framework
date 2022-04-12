"use strict"

const {chainObjectToPromise} = require("../../handlers/ChainHandler")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class deleteRoute extends BaseRoute {
    bind() {
        this.privateData.router.bindRoute({
            verb: "delete",
            path: ":type/:id"
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
            this.helper.verifyRequest(request, resourceConfig, res, "delete")
            const rcHandlers = chainObjectToPromise(resourceConfig.handlers, "delete")
            await rcHandlers.delete(request)

            const response = {
                meta: this.privateData.responseHelper._generateMeta(request)
            }
            this.privateData.router.sendResponse(res, response, 200)
        } catch(err) {
            return this.helper.handleError(request, res, err)
        }
    }
}

module.exports = deleteRoute