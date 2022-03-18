'use strict'

/**
 *
 */
class swaggerPaths {
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
        const paths = { }

        for (const resourceName in this.resources) {
            const resourceConfig = this.resources[resourceName]
            this._addPathDefinition(paths, resourceConfig)
        }

        return paths
    }

    /**
     *
     * @param {*} paths
     * @param {*} resourceConfig
     * @returns
     */
    _addPathDefinition(paths, resourceConfig) {
        if (!paths || !resourceConfig) return undefined
        const resourceName = resourceConfig.resource

        this._addBasicPaths(paths, resourceName, resourceConfig)

        Object.keys(resourceConfig.attributes).filter(relationName => {
            let relation = resourceConfig.attributes[relationName]
            relation = relation._settings
            if (!relation || relation.__as) return false
            relation = (relation.__many || relation.__one)[0]
            return (this.resources[relation] && this.resources[relation].handlers.find)
        }).forEach(relationName => {
            let relation = resourceConfig.attributes[relationName]
            relation = (relation._settings.__one || relation._settings.__many)[0]

            this._addDeepPaths(paths, resourceName, resourceConfig, relationName, relation)
        })
        Object.keys(resourceConfig.actions).forEach(actionName => {
            this._addActionPath(paths, resourceName, actionName, resourceConfig.actions[actionName])
        })
    }

    /**
     *
     * @param {*} paths
     * @param {*} resourceName
     * @param {*} actionName
     * @param {*} action
     */
    _addActionPath(paths, resourceName, actionName, action) {
        const actionPaths = { }
        const actionConfig = action._settings._action
        paths[`/${resourceName}/{id}/${actionName}`] = actionPaths
        if (actionConfig.get) {
            actionPaths.get = this._getActionObject({
                resourceName,
                description: `Action ${actionName} GET on ${resourceName}`,
                hasPathId: true,
                parameters: actionConfig.params
            })
        }
        if (actionConfig.post) {
            actionPaths.post = this._getActionObject({
                resourceName,
                description: `Action ${actionName} POST on ${resourceName}`,
                hasPathId: true,
                parameters: actionConfig.params
            })
        }
    }

    /**
     *
     * @param {*} paths
     * @param {*} resourceName
     * @param {*} resourceConfig
     */
    _addBasicPaths(paths, resourceName, resourceConfig) {
        const genericPaths = { }
        const specificPaths = { }
        paths[`/${resourceName}`] = genericPaths
        paths[`/${resourceName}/{id}`] = specificPaths

        if (resourceConfig.handlers.search) {
            genericPaths.get = this._getPathOperationObject({
                handler: 'search',
                resourceName,
                description: `Search for ${resourceName}`,
                parameters: resourceConfig.searchParams,
                hasPathId: false
            })
        }

        if (resourceConfig.handlers.create) {
            genericPaths.post = this._getPathOperationObject({
                handler: 'create',
                resourceName,
                description: `Create a new instance of ${resourceName}`,
                parameters: resourceConfig.attributes,
                hasPathId: false
            })
        }

        if (resourceConfig.handlers.find) {
            specificPaths.get = this._getPathOperationObject({
                handler: 'find',
                resourceName,
                description: `Get a specific instance of ${resourceName}`,
                hasPathId: true
            })
        }

        if (resourceConfig.handlers.delete) {
            specificPaths.delete = this._getPathOperationObject({
                handler: 'delete',
                resourceName,
                description: `Delete an instance of ${resourceName}`,
                hasPathId: true
            })
        }

        if (resourceConfig.handlers.update) {
            specificPaths.patch = this._getPathOperationObject({
                handler: 'update',
                resourceName,
                description: `Update an instance of ${resourceName}`,
                hasPathId: true
            })
        }
    }

    /**
     *
     * @param {*} paths
     * @param {*} resourceName
     * @param {*} resourceConfig
     * @param {*} relationName
     * @param {*} relation
     */
    _addDeepPaths(paths, resourceName, resourceConfig, relationName, relation) {
        const relationType = resourceConfig.attributes[relationName]._settings.__many ? 'many' : 'one'

        if (resourceConfig.handlers.find) {
            paths[`/${resourceName}/{id}/${relationName}`] = {
                get: this._getPathOperationObject({
                    handler: 'find',
                    description: `Get the ${relationName} instance${relationType === 'many' ? 's' : ''} of a specific instance of ${resourceName}`,
                    resourceName: relation,
                    hasPathId: true
                })
            }
        }

        const relationPaths = { }
        paths[`/${resourceName}/{id}/relationships/${relationName}`] = relationPaths
        const description = `the ${relationName} relationship of a specific instance of ${resourceName}`

        if (resourceConfig.handlers.find) {
            relationPaths.get = this._getPathOperationObject({
                description: `Get ${description}`,
                handler: 'find',
                resourceName: relation,
                relationType,
                extraTags: resourceName,
                hasPathId: true
            })
        }

        if (resourceConfig.handlers.update) {
            relationPaths.post = this._getPathOperationObject({
                description: `Create ${description}`,
                handler: 'create',
                resourceName: relation,
                relationType,
                extraTags: resourceName,
                hasPathId: true
            })
        }

        if (resourceConfig.handlers.update) {
            relationPaths.patch = this._getPathOperationObject({
                description: `Update ${description}`,
                handler: 'update',
                resourceName: relation,
                relationType,
                extraTags: resourceName,
                hasPathId: true
            })
        }

        if (resourceConfig.handlers.update) {
            relationPaths.delete = this._getPathOperationObject({
                description: `Delete ${description}`,
                handler: 'delete',
                resourceName: relation,
                relationType,
                extraTags: resourceName,
                hasPathId: true
            })
        }
    }

    /**
     *
     * @param {*} options
     * @returns
     */
    _getActionObject(options) {
        const actionDefinition = {
            tags: [ options.resourceName ],
            description: options.description,
            parameters: [ ],
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
        if (options.hasPathId) {
            actionDefinition.parameters.push({
                name: 'id',
                in: 'path',
                description: 'id of specific instance to lookup',
                required: true,
                type: 'string'
            })
        }
        if (options.parameters) {
            const additionalParams = Object.keys(options.parameters).map(paramName => {
                const joiScheme = options.parameters[paramName]
                if ((paramName === 'id') || (paramName === 'type')) return null

                return {
                    name: paramName,
                    in: 'query',
                    description: joiScheme._description || undefined,
                    required: ((joiScheme._flags || { }).presence === 'required'),
                    type: joiScheme._type
                }
            })
            actionDefinition.parameters = actionDefinition.parameters.concat(additionalParams)
        }
        return actionDefinition
    }

    /**
     *
     * @param {*} options
     * @returns
     */
    _getPathOperationObject(options) {
        const pathDefinition = {
            tags: [ options.resourceName ],
            description: options.description,
            parameters: [ ],
            responses: {
                '200': {
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
                                    self: {
                                        type: 'string'
                                    },
                                    first: {
                                        type: 'string'
                                    },
                                    last: {
                                        type: 'string'
                                    },
                                    next: {
                                        type: 'string'
                                    },
                                    prev: {
                                        type: 'string'
                                    }
                                }
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
        if (options.extraTags) {
            pathDefinition.tags = [...new Set([...pathDefinition.tags, ...options.extraTags]).values()]
        }

        const responseShortcut = pathDefinition.responses['200'].schema.properties
        responseShortcut.data = {
            '$ref': `#/definitions/${options.resourceName}`
        }

        if (options.handler === 'search') {
            responseShortcut.data = {
                type: 'array',
                items: responseShortcut.data
            }
        }
        if (((options.handler === 'search') || (options.handler === 'find')) && !options.relation) {
            pathDefinition.parameters = pathDefinition.parameters.concat(this._optionalJsonApiParameters())
            responseShortcut.included = {
                type: 'array',
                items: {
                    type: 'object'
                }
            }
        }

        if ((options.handler === 'create') || (options.handler === 'update')) {
            const body = this._getBaseResourceModel(options.resourceName)
            if (options.relationType) {
                body.schema.properties.data = this._getRelationModel()
                if ((options.handler === 'update') && (options.relationType === 'many')) {
                    body.schema.properties.data = {
                        type: 'array',
                        items: body.schema.properties.data
                    }
                }
            }
            pathDefinition.parameters = pathDefinition.parameters.concat(body)
        }

        if (options.handler === 'delete' && options.relationType) {
            const body2 = this._getBaseResourceModel(options.resourceName)
            body2.schema.properties.data = this._getRelationModel()
            pathDefinition.parameters = pathDefinition.parameters.concat(body2)
        }

        if (options.handler === 'delete') {
            responseShortcut.data = undefined
        }

        if (options.handler === 'create') {
            pathDefinition.responses['201'] = pathDefinition.responses['200']
            pathDefinition.responses['200'] = undefined
        }

        if (options.hasPathId) {
            pathDefinition.parameters.push({
                name: 'id',
                in: 'path',
                description: 'id of specific instance to lookup',
                required: true,
                type: 'string'
            })
        }

        if (options.parameters) {
            const additionalParams = Object.keys(options.parameters).map(paramName => {
                const joiScheme = options.parameters[paramName]
                if ((paramName === 'id') || (paramName === 'type')) return null

                return {
                    name: paramName,
                    in: 'query',
                    description: joiScheme._description || undefined,
                    required: ((joiScheme._flags || { }).presence === 'required'),
                    type: joiScheme._type
                }
            })
            pathDefinition.parameters.concat(additionalParams)
        }

        if (options.relationType) {
            responseShortcut.data = this._getRelationModel()
            if (options.relationType === 'many') {
                responseShortcut.data = {
                    type: 'array',
                    items: responseShortcut.data
                }
            }
        }

        return pathDefinition
    }

    /**
     *
     * @returns
     */
    _optionalJsonApiParameters() {
        return [
            { '$ref': '#/parameters/sort' },
            { '$ref': '#/parameters/include' },
            { '$ref': '#/parameters/filter' },
            { '$ref': '#/parameters/fields' },
            { '$ref': '#/parameters/page' }
        ]
    }

    /**
     *
     * @returns
     */
    _getRelationModel() {
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
     * @param {*} resourceName
     * @returns
     */
    _getBaseResourceModel(resourceName) {
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
}

module.exports = swaggerPaths