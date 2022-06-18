"use strict"

const SchemaHelper = require("../SchemaHelper")
const SwaggerPathOperation = require("./SwaggerPathOperation")

/**
 * @typedef {import("../../types/jsonApi").ResourceConfig} ResourceConfig
 * @typedef {import("../../types/Handler").handlerName} handlerName
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
     * @param {string} resourceName
     * @param {ResourceConfig} resourceConfig
     * @returns {{[path: string]: import("openapi3-ts").PathsObject}}
     */
    #basicPaths(resourceName, resourceConfig) {
        /**
         *
         * @param {handlerName} handlername
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
         * @param {handlerName} pseudoHandlerName
         * @param {handlerName} handlerName
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
     * parameters: SchemaHelper}} options
     * @returns {import("openapi3-ts").OperationObject}
     */
    #getActionObject(options) {
        const extraParameters = options.parameters.objectEntries.filter(
            ([paramName]) => paramName != "id" && paramName != "type"
        ).map(([paramName, innerHelper]) => ({
            name: paramName,
            in: "query",
            description: innerHelper.description || undefined,
            required: innerHelper.isRequired,
            type: innerHelper.type,
        }))

        return {
            tags: [options.resourceName],
            description: options.description,
            parameters: [
                {
                    name: "id",
                    in: "path",
                    description: "id of specific instance to look up",
                    required: true,
                    type: "string"
                },
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
     * @param {{description: string, extraTags?: string[], handler: handlerName,
     * hasPathId: boolean, relation?: any, relationType?: "many" | "one",
     * resourceName: string}} options
     * @returns {import("openapi3-ts").OperationObject}
     */
    #getPathOperationObject(options) {
        return new SwaggerPathOperation(options)
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