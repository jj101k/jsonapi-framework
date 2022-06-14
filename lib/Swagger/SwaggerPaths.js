"use strict"

const SchemaHelper = require("../SchemaHelper")

/**
 * @typedef {import("../../types/jsonApi").ResourceConfig} ResourceConfig
 */

/**
 *
 */
class SwaggerPaths {
    /**
     * @type {{[resource: string]: ResourceConfig}}
     */
    #resources

    /**
     *
     * @param {string} resourceName
     * @param {string} actionName
     * @param {SchemaHelper} helper
     * @returns {import("openapi3-ts").PathItemObject}
     */
    #actionPath(resourceName, actionName, helper) {
        /**
         *
         * @param {string} methodName
         * @param {string} description
         */
        const handlerSchema = (methodName, description) => {
            if(helper.actionFor(methodName)) {
                return this.#getActionObject({
                    action: methodName,
                    resourceName,
                    description,
                    hasPathId: true,
                    parameters: helper,
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
     * @param {import("openapi3-ts").RequestBodyObject} body
     * @param {*} schemaProperties
     * @returns
     */
    #addData(body, schemaProperties) {
        /**
         * @type {body["content"]}
         */
        const content = {}
        for(const [contentType, typedContent] of Object.entries(body.content)) {
            if(
                (contentType == "application/json" || contentType == "application/vnd.api+json") &&
                typedContent.schema && ("properties" in typedContent.schema)
            ) {
                content[contentType] = {
                    ...typedContent,
                    schema: {
                        ...typedContent.schema,
                        properties: {...typedContent.schema.properties, ...schemaProperties},
                    }
                }
            } else {
                content[contentType] = typedContent
            }
        }
        return {...body, content}
    }

    /**
     *
     * @param {string} resourceName
     * @param {ResourceConfig} resourceConfig
     * @returns {{[path: string]: import("openapi3-ts").PathsObject}}
     */
    #basicPaths(resourceName, resourceConfig) {
        /**
         *
         * @param {string} handlername
         * @param {string} description
         * @param {boolean} hasPathId
         * @returns {import("openapi3-ts").PathsObject | undefined}
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
     * @param {SchemaHelper} helper
     * @param {string} resourceName
     * @param {import("../../types/ResourceConfig").ResourceConfig} resourceConfig
     * @param {string} relationName
     * @param {string} relation
     * @returns {import("openapi3-ts").PathsObject}
     */
    #deepPaths(helper, resourceName, resourceConfig, relationName, relation) {
        const relationType = helper.isToManyRelationship ? "many" : "one"

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
                        handler: "find",
                        description: `Get the ${relationName} instance${relationType === "many" ? "s" : ""} of a specific instance of ${resourceName}`,
                        resourceName: relation,
                        hasPathId: true
                    })
                } :
                undefined,
            [`/${resourceName}/{id}/relationships/${relationName}`]: {
                get: handlerSchema(`Get ${description}`, "find", "find"),
                post: handlerSchema(`Create ${description}`, "create", "update"),
                patch: handlerSchema(`Update ${description}`, "update", "update"),
                delete: handlerSchema(`Delete ${description}`, "delete", "update"),
            },
        }
    }

    /**
     *
     * @param {{resourceName: string, description: string, action: string,
     * hasPathId: boolean, parameters: SchemaHelper}} options
     * @returns {import("openapi3-ts").OperationObject}
     */
    #getActionObject(options) {
        let pathParameters
        if (options.hasPathId) {
            pathParameters = [{
                name: "id",
                in: "path",
                description: "id of specific instance to look up",
                required: true,
                type: "string"
            }]
        } else {
            pathParameters = []
        }

        let extraParameters
        if (options.parameters) {
            extraParameters = options.parameters.objectEntries.filter(
                ([paramName]) => paramName != "id" && paramName != "type"
            ).map(([paramName, innerHelper]) => {
                return {
                    name: paramName,
                    in: "query",
                    description: innerHelper.description || undefined,
                    required: innerHelper.isRequired,
                    type: innerHelper.type,
                }
            })
        } else {
            extraParameters = []
        }

        return {
            tags: [options.resourceName],
            description: options.description,
            parameters: [
                ...pathParameters,
                ...extraParameters,
            ],
            responses: {
                200: {
                    description: `${options.resourceName} ${options.action} response`,
                    schema: {
                        type: "object",
                        required: ["jsonapi", "meta", "links"],
                        properties: {
                            jsonapi: {
                                type: "object",
                                required: ["version"],
                                properties: {
                                    version: {
                                        type: "string"
                                    }
                                }
                            },
                            meta: {
                                type: "object"
                            }
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    schema: {
                        $ref: "#/definitions/error"
                    }
                }
            }
        }
    }

    /**
     *
     * @param {{description: string, extraTags?: string[], handler: string,
     * hasPathId: boolean, parameters?: any, relation?: any,
     * relationType?: string, resourceName: string}} options
     * @returns {import("openapi3-ts").OperationObject}
     */
    #getPathOperationObject(options) {
        let successDataType
        if (options.relationType) {
            if (options.relationType === "many") {
                successDataType = {
                    type: "array",
                    items: this.#getRelationModel()
                }
            } else {
                successDataType = this.#getRelationModel()
            }
        } else if (options.handler === "search") {
            successDataType = {
                type: "array",
                items: {
                    $ref: `#/definitions/${options.resourceName}`
                }
            }
        } else if (options.handler === "delete") {
            successDataType = undefined
        } else {
            successDataType = {
                $ref: `#/definitions/${options.resourceName}`
            }
        }

        let successCode
        if (options.handler === "create") {
            successCode = 201
        } else {
            successCode = 200
        }

        let included
        if(((options.handler === "search") || (options.handler === "find")) && !options.relation) {
            included = {
                type: "array",
                items: {
                    type: "object"
                }
            }
        } else {
            included = undefined
        }

        /**
         * @type {import("openapi3-ts").RequestBodyObject | undefined}
         */
        let requestBody
        /**
         * @type {(import("openapi3-ts").ParameterObject |
         * import("openapi3-ts").ReferenceObject)[] | undefined}
         */
        let handlerParams
        if (((options.handler === "search") || (options.handler === "find")) && !options.relation) {
            handlerParams = [
                {$ref: "#/parameters/sort"},
                {$ref: "#/parameters/include"},
                {$ref: "#/parameters/filter"},
                {$ref: "#/parameters/fields"},
                {$ref: "#/parameters/page"}
            ]
        } else if ((options.handler === "create") || (options.handler === "update")) {
            if (options.relationType) {
                let data
                if ((options.handler === "update") && (options.relationType === "many")) {
                    data = {
                        type: "array",
                        items: this.#getRelationModel()
                    }
                } else {
                    data = this.#getRelationModel()
                }
                requestBody = this.#addData(this.#getBaseResourceModel(options.resourceName), data)
            } else {
                requestBody = this.#getBaseResourceModel(options.resourceName)
            }
        } else if (options.handler === "delete" && options.relationType) {
            requestBody = this.#addData(this.#getBaseResourceModel(options.resourceName), this.#getRelationModel())
        } else {
            requestBody = undefined
        }

        let pathParameters
        if (options.hasPathId) {
            pathParameters = [{
                name: "id",
                in: "path",
                description: "id of specific instance to look up",
                required: true,
                type: "string"
            }]
        } else {
            pathParameters = []
        }

        // TODO: there was a section for extra parameters here, but it never worked

        return {
            tags: options.extraTags ?
                [...new Set([options.resourceName, ...options.extraTags]).values()] :
                [options.resourceName],
            description: options.description,
            parameters: [
                ...pathParameters,
                ...(handlerParams || []),
            ],
            requestBody,
            responses: {
                [successCode]: {
                    description: `${options.resourceName} ${options.handler} response`,
                    schema: {
                        type: "object",
                        required: ["jsonapi", "meta", "links"],
                        properties: {
                            jsonapi: {
                                type: "object",
                                required: ["version"],
                                properties: {
                                    version: {
                                        type: "string"
                                    }
                                }
                            },
                            meta: {
                                type: "object"
                            },
                            links: {
                                type: "object",
                                required: ["self"],
                                properties: {
                                    self: {type: "string"},
                                    first: {type: "string"},
                                    last: {type: "string"},
                                    next: {type: "string"},
                                    prev: {type: "string"},
                                }
                            },
                            data: successDataType,
                            included,
                        }
                    }
                },
                default: {
                    description: "Unexpected error",
                    schema: {
                        $ref: "#/definitions/error"
                    }
                }
            }
        }
    }

    /**
     *
     * @param {string} resourceName
     * @returns {import("openapi3-ts").RequestBodyObject}
     */
    #getBaseResourceModel(resourceName) {
        return {
            description: "New or partial resource",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                $ref: `#/definitions/${resourceName}`
                            }
                        }
                    }
                },
                "application/vnd.api+json": {
                    schema: {
                        type: "object",
                        properties: {
                            data: {
                                $ref: `#/definitions/${resourceName}`
                            }
                        }
                    }
                },
            },
            required: true,
        }
    }

    /**
     *
     * @returns {import("openapi3-ts").RequestBodyObject["content"][0]["schema"]}
     */
    #getRelationModel() {
        return {
            type: "object",
            required: ["type", "id"],

            properties: {
                type: {
                    type: "string"
                },
                id: {
                    type: "string"
                },
                meta: {
                    type: "object"
                }
            }
        }
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig | null} resourceConfig
     * @returns {import("openapi3-ts").PathsObject | undefined}
     */
    #pathDefinition(resourceConfig) {
        if (!resourceConfig) return undefined
        /**
         * @type {import("openapi3-ts").PathsObject}
         */
        let paths = {
            ...this.#basicPaths(resourceConfig.resource, resourceConfig),
        }

        for(const [attributeName, attributeConfig] of Object.entries(resourceConfig.attributes)) {
            const helper = SchemaHelper.for(attributeConfig)
            if(!helper.isRelationship || helper.isBelongsToRelationship) continue
            const relationEntityName = helper.relationTypes[0]
            if(this.#resources[relationEntityName]?.handlers.find) {
                paths = {
                    ...paths,
                    ...this.#deepPaths(helper, resourceConfig.resource, resourceConfig, attributeName, relationEntityName)
                }
            }
        }

        for(const [actionName, actionConfig] of Object.entries(resourceConfig.actions)) {
            const helper = SchemaHelper.for(actionConfig)
            paths = {
                ...paths,
                ...this.#actionPath(resourceConfig.resource, actionName, helper)
            }
        }

        return paths
    }

    /**
     *
     * @param {{[resource: string]: ResourceConfig}} resources
     */
    constructor(resources) {
        this.#resources = resources
    }

    /**
     *
     * @returns {import("openapi3-ts").PathsObject}
     */
    getPathDefinitions() {
        /**
         * @type {import("openapi3-ts").PathsObject}
         */
        let paths = { }

        for (const resourceConfig of Object.values(this.#resources)) {
            paths = {
                ...paths,
                ...this.#pathDefinition(resourceConfig),
            }
        }

        return paths
    }
}

module.exports = SwaggerPaths