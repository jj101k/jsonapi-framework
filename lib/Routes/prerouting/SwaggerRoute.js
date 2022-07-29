"use strict"
const Swagger = require("../../Swagger")
const BaseRoute = require("../BaseRoute")

/**
 *
 */
class SwaggerRoute extends BaseRoute {
    /**
     * @type {ReturnType<Swagger["generateDocumentation"]> | undefined}
     */
    #cache

    routeSpec = {
        verb: "get",
        path: "swagger.json"
    }

    handlePostProcess(request, response) {
    }

    /**
     *
     * @param {import("../../../types/Handler").JsonApiRequest} request
     * @param {import("../../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("express").Response} res
     */
    handler(request, resourceConfig, res) {
        if (!this.jsonApi._apiConfig.swagger) return
        try {
            if (!this.#cache) {
                const swaggerGenerator = new Swagger(this.jsonApi._resources, this.jsonApi._apiConfig)
                this.#cache = swaggerGenerator.generateDocumentation()
            }

            return res.json(this.#cache)
        } catch(err) {
            return this.handleError(request, res, err)
        }
    }
}

module.exports = SwaggerRoute