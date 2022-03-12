'use strict'
const url = require('url')
const swaggerPaths = require('./paths')
const swaggerResources = require('./resources')

/**
 *
 */
class swaggerClass {
    /**
     *
     * @param {*} resources
     * @param {*} apiConfig
     */
    constructor(resources, apiConfig) {
        this.resources = resources
        this.apiConfig = apiConfig
    }
    /**
     *
     * @returns
     */
    generateDocumentation() {
        const swaggerDoc = this._getSwaggerBase()
        swaggerDoc.paths = new swaggerPaths(this.resources).getPathDefinitions()
        swaggerDoc.definitions = new swaggerResources(this.resources).getResourceDefinitions()
        return swaggerDoc
    }

    /**
     *
     * @returns
     */
    _getSwaggerBase() {
console.warn(this.apiConfig)


        const swaggerConfig = this.apiConfig.swagger || { }
        let basePath, host, protocol
        if (this.apiConfig.urlPrefixAlias) {
            const urlObj = url.parse(this.apiConfig.urlPrefixAlias)
            basePath = urlObj.pathname.replace(/(?!^\/)\/$/, '')
            host = urlObj.host
            protocol = urlObj.protocol.replace(/:$/, '')
        } else {
            host = this.apiConfig.host
            basePath = this.apiConfig.base.substring(0, this.apiConfig.base.length - 1)
            protocol = this.apiConfig.protocol
        }
        return {
            swagger: '2.0',
            info: {
                title: swaggerConfig.title,
                version: swaggerConfig.version,
                description: swaggerConfig.description,
                termsOfService: swaggerConfig.termsOfService,
                contact: {
                    name: (swaggerConfig.contact || { }).name,
                    email: (swaggerConfig.contact || { }).email,
                    url: (swaggerConfig.contact || { }).url
                },
                license: {
                    name: (swaggerConfig.license || { }).name,
                    url: (swaggerConfig.license || { }).url
                }
            },
            host,
            basePath,
            schemes: [ protocol ],
            consumes: [
                'application/vnd.api+json'
            ],
            produces: [
                'application/vnd.api+json'
            ],
            parameters: {
                sort: {
                    name: 'sort',
                    in: 'query',
                    description: 'Sort resources as per the JSON:API specification',
                    required: false,
                    type: 'string'
                },
                include: {
                    name: 'include',
                    in: 'query',
                    description: 'Fetch additional resources as per the JSON:API specification',
                    required: false,
                    type: 'string'
                },
                filter: {
                    name: 'filter',
                    in: 'query',
                    description: 'Filter resources as per the JSON:API specification',
                    required: false,
                    type: 'string'
                },
                fields: {
                    name: 'fields',
                    in: 'query',
                    description: 'Limit response payloads as per the JSON:API specification',
                    required: false,
                    type: 'string'
                },
                page: {
                    name: 'page',
                    in: 'query',
                    description: 'Pagination namespace',
                    required: false,
                    type: 'string'
                }
            },
            paths: { },
            definitions: { },
            security: swaggerConfig.security || [ ],
            securityDefinitions: swaggerConfig.securityDefinitions || { }
        }
    }
}

module.exports = swaggerClass