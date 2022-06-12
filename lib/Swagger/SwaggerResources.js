"use strict"

const SchemaHelper = require("../SchemaHelper")

/**
 * @typedef {import("../../types/ResourceConfig").ResourceConfig} ResourceConfig
 * @typedef {import("openapi3-ts").SchemaObject} JsonSchema
 */

/**
 *
 */
class SwaggerResources {
    /**
     * @type {{[resourceName: string]: ResourceConfig}}
     */
    #resources

    /**
     *
     * @returns {JsonSchema}
     */
    get #errorDefinition() {
        return {
            type: "object",
            required: ["jsonapi", "meta", "links", "errors"],

            properties: {
                jsonapi: {
                    type: "object",
                    required: ["version"],
                    properties: {
                        version: {type: "string"},
                    }
                },
                meta: {
                    type: "object"
                },
                links: {
                    type: "object",
                    properties: {
                        self: {type: "string"},
                    }
                },
                errors: {
                    type: "array",
                    items: {
                        type: "object",
                        required: ["status", "code", "title", "detail"],
                        properties: {
                            status: {type: "string"},
                            code: {type: "string"},
                            title: {type: "string"},
                            detail: {type: "object"},
                        }
                    }
                }
            }
        }
    }

    /**
     *
     * @param {SchemaHelper} helper
     * @returns {[JsonSchema, boolean]}
     */
    #attributeSchema(helper) {
        const type = helper.type
        const description = helper.description || undefined
        /**
         * @type {JsonSchema}
         */
        let schema
        if (type === "date") {
            schema = {
                type: "string",
                format: "date",
                description,
            }
        } else if (type === "array") {
            let properties
            const itemTypeHelper = helper.arrayItemTypeHelper
            if (itemTypeHelper) {
                if (itemTypeHelper.type == "object") {
                    properties = Object.fromEntries(
                        itemTypeHelper.objectEntries.map(([k, v]) => [k, {type: v.type}])
                    )
                } else {
                    properties = undefined
                }
            } else {
                properties = undefined
            }
            schema = {
                type: "array",
                items: {
                    type: "object",
                    properties,
                },
                description,
            }
        } else {
            schema = {
                type,
                description,
            }
        }

        return [schema, helper.isRequired]
    }

    /**
     *
     * @param {SchemaHelper} helper
     * @returns {JsonSchema}
     */
    #relationshipSchema(helper) {
        let required
        if (helper.isRequired) {
            if (helper.isToManyRelationship) {
                required = true
            } else {
                required = ["type", "id"]
            }
        }

        /**
         * @type {JsonSchema}
         */
        const objectDatum = {
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

        return {
            type: "object",
            properties: {
                meta: {
                    type: "object"
                },
                links: {
                    type: "object",
                    properties: {
                        self: {
                            type: "string"
                        },
                        related: {
                            type: "string"
                        }
                    }
                },
                data: helper.isToManyRelationship ?
                    {
                        type: "array",
                        items: objectDatum,
                    } :
                    objectDatum
            },
            required,
        }
    }

    /**
     *
     * @param {ResourceConfig} resourceConfig
     * @returns {JsonSchema}
     */
    #resourceDefinition(resourceConfig) {
        if (Object.keys(resourceConfig.handlers || { }).length === 0) return undefined

        /**
         * @type {{[key: string]: JsonSchema}}
         */
        const attributeSchema = {}
        /**
         * @type {{[key: string]: JsonSchema}}
         */
        const relationshipSchema = {}
        /**
         * @type {string[] | undefined}
         */
        let requiredAttributes

        for (const [attribute, joiSchema] of Object.entries(resourceConfig.attributes)) {
            if (attribute === "id" || attribute === "type" || attribute === "meta") continue
            const helper = SchemaHelper.for(joiSchema)

            if(!helper.isRelationship) {
                const [schema, required] = this.#attributeSchema(helper)
                attributeSchema[attribute] = schema
                if (required) {
                    if(!requiredAttributes) {
                        requiredAttributes = []
                    }
                    requiredAttributes.push(attribute)
                }
            } else {
                // BUG COMPAT: this was originally supposed to be for
                // non-belongs-to relationships only, but the test was never
                // implemented correctly
                relationshipSchema[attribute] = this.#relationshipSchema(helper)
            }
        }

        return {
            description: resourceConfig.description,
            type: "object",
            // required: [ "id", "type", "attributes", "relationships", "links" ],
            properties: {
                id: {
                    type: "string"
                },
                type: {
                    type: "string"
                },
                attributes: {
                    type: "object",
                    properties: attributeSchema,
                    required: requiredAttributes,
                },
                relationships: {
                    type: "object",
                    properties: relationshipSchema,
                },
                links: {
                    type: "object",
                    properties: {
                        self: {
                            type: "string"
                        }
                    }
                },
                meta: {
                    type: "object"
                },
            }
        }
    }

    /**
     *
     * @returns {{[resourceName: string]: JsonSchema} & {error: JsonSchema}}
     */
    get resourceDefinitions() {
        return {
            ...Object.fromEntries(
                Object.entries(this.#resources).map(([resource, config]) => [resource, this.#resourceDefinition(config)])
            ),
            error: this.#errorDefinition,
        }
    }

    /**
     *
     * @param {{[resourceName: string]: ResourceConfig}} resources
     */
    constructor(resources) {
        this.#resources = resources
    }
}

module.exports = SwaggerResources