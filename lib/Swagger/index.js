"use strict"
const swaggerPaths = require("./paths")
const SwaggerResources = require("./SwaggerResources")

/**
 * @typedef {import("../../types/jsonApi").ApiConfig} ApiConfig
 * @typedef {import("../../types/ResourceConfig").ResourceConfig} ResourceConfig
 */

/**
 *
 */
class Swagger {
    /**
     * @type {ApiConfig}
     */
    #apiConfig

    /**
     * @type {{[resource: string]: ResourceConfig}}
     */
    #resources

    /**
     * This is the Swagger spec, minus the things specific to routes & resources.
     *
     * @returns
     */
    #getSwaggerBase() {
        const swaggerConfig = this.#apiConfig.swagger || { }
        let basePath, host, protocol
        if (this.#apiConfig.urlPrefixAlias) {
            const url = new URL(this.#apiConfig.urlPrefixAlias)
            basePath = url.pathname.replace(/(?!^\/)\/$/, "")
            host = url.host
            protocol = url.protocol.replace(/:$/, "")
        } else {
            host = this.#apiConfig.host
            basePath = this.#apiConfig.base.replace(/.$/, "")
            protocol = this.#apiConfig.protocol
        }
        const contact = (swaggerConfig.contact || { })
        const licence = (swaggerConfig.license || { })
        return {
            swagger: "2.0",
            info: {
                title: swaggerConfig.title,
                version: swaggerConfig.version,
                description: swaggerConfig.description,
                termsOfService: swaggerConfig.termsOfService,
                contact: {
                    name: contact.name,
                    email: contact.email,
                    url: contact.url
                },
                license: {
                    name: licence.name,
                    url: licence.url
                }
            },
            host,
            basePath,
            schemes: [protocol],
            consumes: [
                "application/vnd.api+json",
                "application/json",
            ],
            produces: [
                "application/vnd.api+json",
                "application/json",
            ],
            parameters: {
                sort: {
                    name: "sort",
                    in: "query",
                    description: "Sort resources as per the JSON:API specification",
                    required: false,
                    type: "string"
                },
                include: {
                    name: "include",
                    in: "query",
                    description: "Fetch additional resources as per the JSON:API specification",
                    required: false,
                    type: "string"
                },
                filter: {
                    name: "filter",
                    in: "query",
                    description: "Filter resources as per the JSON:API specification",
                    required: false,
                    type: "string"
                },
                fields: {
                    name: "fields",
                    in: "query",
                    description: "Limit response payloads as per the JSON:API specification",
                    required: false,
                    type: "string"
                },
                page: {
                    name: "page",
                    in: "query",
                    description: "Pagination namespace",
                    required: false,
                    type: "string"
                }
            },
            paths: { },
            definitions: { },
            security: swaggerConfig.security || [],
            securityDefinitions: swaggerConfig.securityDefinitions || { }
        }
    }

    /**
     *
     * @param {{[resource: string]: ResourceConfig}} resources
     * @param {ApiConfig} apiConfig
     */
    constructor(resources, apiConfig) {
        this.#resources = resources
        this.#apiConfig = apiConfig
    }

    /**
     * This is a full Swagger spec
     *
     * @returns
     */
    generateDocumentation() {
        return {
            ...this.#getSwaggerBase(),
            paths: new swaggerPaths(this.#resources).getPathDefinitions(),
            definitions: new SwaggerResources(this.#resources).resourceDefinitions,
        }
    }
}

module.exports = Swagger