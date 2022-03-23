'use strict'

/**
 *
 */
class swaggerPaths {
    /**
     *
     * @param {string} resourceName
     * @param {string} actionName
     * @param {*} action
     */
    #actionPath(resourceName, actionName, action) {
        /**
         *
         * @param {string} methodName
         * @param {string} description
         */
         const handlerSchema = (methodName, description) => {
            if(action._settings._action[methodName]) {
                return this.#getActionObject({
                    resourceName,
                    description,
                    hasPathId: true,
                    parameters: action._settings._action.params
                })
            } else {
                return undefined
            }
        }

        return {
            [`/${resourceName}/{id}/${actionName}`]: {
                get: handlerSchema("get", `Action ${actionName} GET on ${resourceName}`),
                post: handlerSchema("post", `Action ${actionName} POST on ${resourceName}`),
            },
        }
    }

    /**
     *
     * @param {*} body
     * @param {*} data
     * @returns
     */
    #addData(body, data) {
        return {
            ...body,
            schema: {
                ...body.schema,
                properties: {
                    ...body.schema.properties,
                    data,
                }
            }
        }
    }

    /**
     *
     * @param {string} resourceName
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     */
    #basicPaths(resourceName, resourceConfig) {
        /**
         *
         * @param {string} handlername
         * @param {string} description
         * @param {boolean} hasPathId
         */
        const handlerSchema = (handlername, description, hasPathId) => {
            if(resourceConfig.handlers[handlername]) {
                return this.#getPathOperationObject({
                    handler: handlername,
                    resourceName,
                    description,
                    parameters: resourceConfig.searchParams,
                    hasPathId,
                })
            } else {
                return undefined
            }
        }
        return {
            [`/${resourceName}`]: {
                get: handlerSchema("search", `Search for ${resourceName}`, false),
                post: handlerSchema("create", `Create a new instance of ${resourceName}`, false),
            },
            [`/${resourceName}/{id}`]: {
                get: handlerSchema("find", `Get a specific instance of ${resourceName}`, true),
                delete: handlerSchema("delete", `Delete an instance of ${resourceName}`, true),
                patch: handlerSchema("update", `Update an instance of ${resourceName}`, true),
            },
        }
    }

    /**
     *
     * @param {*} resourceName
     * @param {*} resourceConfig
     * @param {*} relationName
     * @param {*} relation
     */
    #deepPaths(resourceName, resourceConfig, relationName, relation) {
        const relationType = resourceConfig.attributes[relationName]._settings.__many ? 'many' : 'one'

        /**
         *
         * @param {string} description
         * @param {string} pseudoHandlerName
         * @param {string} handlerName
         */
        const handlerSchema = (description, pseudoHandlerName, handlerName) => {
            if(resourceConfig.handlers[handlerName]) {
                return this.#getPathOperationObject({
                    description,
                    handler: pseudoHandlerName,
                    resourceName: relation,
                    relationType,
                    extraTags: resourceName,
                    hasPathId: true,
                })
            } else {
                return undefined
            }
        }

        const description = `the ${relationName} relationship of a specific instance of ${resourceName}`

        return {
            [`/${resourceName}/{id}/${relationName}`]: resourceConfig.handlers.find ?
                {
                    get: this.#getPathOperationObject({
                        handler: 'find',
                        description: `Get the ${relationName} instance${relationType === 'many' ? 's' : ''} of a specific instance of ${resourceName}`,
                        resourceName: relation,
                        hasPathId: true
                    })
                } :
                undefined,
            [`/${resourceName}/{id}/relationships/${relationName}`]: {
                get: handlerSchema(`Get ${description}`, 'find', "find"),
                post: handlerSchema(`Create ${description}`, 'create', "update"),
                patch: handlerSchema(`Update ${description}`, 'update', "update"),
                delete: handlerSchema(`Delete ${description}`, 'delete', "update"),
            },
        }
    }

    /**
     *
     * @param {{resourceName: string, description: string, action: string,
     * hasPathId: boolean, parameters: {[key: string]: any}}} options
     * @returns
     */
     #getActionObject(options) {
        let pathParameters
        if (options.hasPathId) {
            pathParameters = [{
                name: 'id',
                in: 'path',
                description: 'id of specific instance to lookup',
                required: true,
                type: 'string'
            }]
        } else {
            pathParameters = []
        }

        let extraParameters
        if (options.parameters) {
            extraParameters = Object.entries(options.parameters).filter(
                ([paramName]) => paramName != 'id' && paramName != 'type'
            ).map(([paramName, joiSchema]) => ({
                name: paramName,
                in: 'query',
                description: joiSchema._description || undefined,
                required: ((joiSchema._flags || { }).presence === 'required'),
                type: joiSchema._type
            }))
        } else {
            extraParameters = []
        }

        return {
            tags: [ options.resourceName ],
            description: options.description,
            parameters: [
                ...pathParameters,
                ...extraParameters,
            ],
            responses: {
                '200': {
                    description: `${options.resourceName} ${options.action} response`,
                    schema: {
                        type: 'object',
                        required: [ 'jsonapi', 'meta', 'links' ],
                        properties: {
                            jsonapi: {
                                type: 'object',
                                required: [ 'version' ],
                                properties: {
                                    version: {
                                        type: 'string'
                                    }
                                }
                            },
                            meta: {
                                type: 'object'
                            }
                        }
                    }
                },
                default: {
                    description: 'Unexpected error',
                    schema: {
                        '$ref': '#/definitions/error'
                    }
                }
            }
        }
    }

    /**
     *
     * @param {{description: string, extraTags?: string[], handler: string,
     * hasPathId: boolean, parameters?: {[key: string]: string}, relation?: any,
     * relationType: string, resourceName: string}} options
     * @returns
     */
    #getPathOperationObject(options) {
        let successDataType
        if (options.relationType) {
            if (options.relationType === 'many') {
                successDataType = {
                    type: 'array',
                    items: this.#getRelationModel()
                }
            } else {
                successDataType = this.#getRelationModel()
            }
        } else if (options.handler === 'search') {
            successDataType = {
                type: 'array',
                items: {
                    '$ref': `#/definitions/${options.resourceName}`
                }
            }
        } else if (options.handler === 'delete') {
            successDataType = undefined
        } else {
            successDataType = {
                '$ref': `#/definitions/${options.resourceName}`
            }
        }

        let successCode
        if (options.handler === 'create') {
            successCode = 201
        } else {
            successCode = 200
        }

        let included
        if(((options.handler === 'search') || (options.handler === 'find')) && !options.relation) {
            included = {
                type: 'array',
                items: {
                    type: 'object'
                }
            }
        } else {
            included = undefined
        }

        let handlerParameters
        if (((options.handler === 'search') || (options.handler === 'find')) && !options.relation) {
            handlerParameters = [
                { '$ref': '#/parameters/sort' },
                { '$ref': '#/parameters/include' },
                { '$ref': '#/parameters/filter' },
                { '$ref': '#/parameters/fields' },
                { '$ref': '#/parameters/page' }
            ]
        } else if ((options.handler === 'create') || (options.handler === 'update')) {
            if (options.relationType) {
                let data
                if ((options.handler === 'update') && (options.relationType === 'many')) {
                    data = {
                        type: 'array',
                        items: this.#getRelationModel()
                    }
                } else {
                    data = this.#getRelationModel()
                }
                handlerParameters = [this.#addData(this.#getBaseResourceModel(options.resourceName), data)]
            } else {
                handlerParameters = [this.#getBaseResourceModel(options.resourceName)]
            }
        } else if (options.handler === 'delete' && options.relationType) {
            handlerParameters = [
                this.#addData(this.#getBaseResourceModel(options.resourceName), this.#getRelationModel())
            ]
        } else {
            handlerParameters = []
        }

        let pathParameters
        if (options.hasPathId) {
            pathParameters = [{
                name: 'id',
                in: 'path',
                description: 'id of specific instance to lookup',
                required: true,
                type: 'string'
            }]
        } else {
            pathParameters = []
        }

        // TODO: there was a section for extra parameters here, but it never worked

        return {
            tags: options.extraTags ?
                [...new Set([options.resourceName, ...options.extraTags]).values()] :
                [ options.resourceName ],
            description: options.description,
            parameters: [
                ...handlerParameters,
                ...pathParameters,
            ],
            responses: {
                [successCode]: {
                    description: `${options.resourceName} ${options.handler} response`,
                    schema: {
                        type: 'object',
                        required: [ 'jsonapi', 'meta', 'links' ],
                        properties: {
                            jsonapi: {
                                type: 'object',
                                required: [ 'version' ],
                                properties: {
                                    version: {
                                        type: 'string'
                                    }
                                }
                            },
                            meta: {
                                type: 'object'
                            },
                            links: {
                                type: 'object',
                                required: [ 'self' ],
                                properties: {
                                    self: {type: 'string'},
                                    first: {type: 'string'},
                                    last: {type: 'string'},
                                    next: {type: 'string'},
                                    prev: {type: 'string'},
                                }
                            },
                            data: successDataType,
                            included,
                        }
                    }
                },
                default: {
                    description: 'Unexpected error',
                    schema: {
                        '$ref': '#/definitions/error'
                    }
                }
            }
        }
    }

    /**
     *
     * @param {string} resourceName
     * @returns
     */
    #getBaseResourceModel(resourceName) {
        return {
            in: 'body',
            name: 'body',
            description: 'New or partial resource',
            required: true,

            schema: {
                type: 'object',
                properties: {
                    data: {
                        '$ref': `#/definitions/${resourceName}`
                    }
                }
            }
        }
    }

    /**
     *
     * @returns
     */
    #getRelationModel() {
        return {
            type: 'object',
            required: [ 'type', 'id' ],

            properties: {
                type: {
                    type: 'string'
                },
                id: {
                    type: 'string'
                },
                meta: {
                    type: 'object'
                }
            }
        }
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig | null} resourceConfig
     * @returns
     */
    #pathDefinition(resourceConfig) {
        if (!resourceConfig) return undefined
        let paths = {
            ...this.#basicPaths(resourceConfig.resource, resourceConfig),
        }

        for(const [attributeName, attributeConfig] of Object.entries(resourceConfig.attributes)) {
            if (!attributeConfig._settings || attributeConfig._settings.__as) continue
            const relationEntityName = (attributeConfig._settings.__many || attributeConfig._settings.__one)[0]
            if(this.resources[relationEntityName]?.handlers.find) {
                paths = {
                    ...paths,
                    ...this.#deepPaths(resourceConfig.resource, resourceConfig, attributeName, relationEntityName)
                }
            }
        }

        for(const [actionName, actionConfig] of Object.entries(resourceConfig.actions)) {
            paths = {
                ...paths,
                ...this.#actionPath(resourceConfig.resource, actionName, actionConfig)
            }
        }

        return paths
    }

    /**
     *
     * @param {*} resources
     */
    constructor(resources) {
        this.resources = resources
    }

    /**
     *
     * @returns
     */
    getPathDefinitions() {
        let paths = { }

        for (const resourceConfig of Object.values(this.resources)) {
            paths = {
                ...paths,
                ...this.#pathDefinition(resourceConfig),
            }
        }

        return paths
    }
}

module.exports = swaggerPaths