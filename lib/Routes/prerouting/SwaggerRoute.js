"use strict"
const swaggerClass = require("../../swagger")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class SwaggerRoute extends BaseRoute {
    /**
     * @type {ReturnType<swaggerClass["generateDocumentation"]> | undefined}
     */
    #cache

    routeSpec = {
        verb: "get",
        path: "swagger.json"
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    throwableHandler(request, resourceConfig, res) {
        if (!this.jsonApi._apiConfig.swagger) return

        if (!this.#cache) {
            const swaggerGenerator = new swaggerClass(this.jsonApi._resources, this.jsonApi._apiConfig)
            this.#cache = swaggerGenerator.generateDocumentation()
        }

        return res.json(this.#cache)
    }
}

module.exports = SwaggerRoute