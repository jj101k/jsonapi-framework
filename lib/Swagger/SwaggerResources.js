"use strict"

/**
 * @typedef {{description: string}} jsonSchemaBase
 * @typedef {{type: "array", items?: jsonSchema} & jsonSchemaBase} jsonSchemaArray
 * @typedef {{type: "string", format?: string} & jsonSchemaBase} jsonSchemaString
 * @typedef {{type: "object", required?: string[], properties?: {[key: string]:
 * jsonSchema}} & jsonSchemaBase} jsonSchemaObject
 * @typedef {jsonSchemaArray | jsonSchemaObject | jsonSchemaString} jsonSchema
 */

/**
 * @typedef {import("../../types/ResourceConfig").ResourceConfig} ResourceConfig
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
     * @returns {jsonSchema}
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
     * @param {import("Joi").Schema} joiSchema
     * @returns {[jsonSchema, boolean]}
     */
    #attributeSchema(joiSchema) {
        const description = joiSchema._description || undefined
        /**
         * @type {jsonSchema}
         */
        let schema
        if (joiSchema._type === "date") {
            schema = {
                type: "string",
                format: "date",
                description,
            }
        } else if (joiSchema.type === "array") {
            const itemsSchema = joiSchema._inner.items
            let properties
            if (itemsSchema.length > 0 && itemsSchema[0]._inner.children) {
                properties = Object.fromEntries(
                    itemsSchema[0]._inner.children.map(x => [x.key, {type: x.schema._type}])
                )
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
                type: joiSchema._type,
                description,
            }
        }

        return [schema, (joiSchema._flags || { }).presence === "required"]
    }

    /**
     *
     * @param {import("Joi").Schema} joiSchema
     * @returns {jsonSchemaObject}
     */
    #relationshipSchema(joiSchema) {
        let required
        if ((joiSchema._flags || { }).presence === "required") {
            if (joiSchema._settings.__many) {
                required = true
            } else {
                required = ["type", "id"]
            }
        }

        /**
         * @type {jsonSchemaObject}
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
                data: joiSchema._settings.__many ?
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
     * @returns {jsonSchemaObject}
     */
    #resourceDefinition(resourceConfig) {
        if (Object.keys(resourceConfig.handlers || { }).length === 0) return undefined

        /**
         * @type {{[key: string]: jsonSchema}}
         */
        const attributeSchema = {}
        /**
         * @type {{[key: string]: jsonSchema}}
         */
        const relationshipSchema = {}
        /**
         * @type {string[] | undefined}
         */
        let requiredAttributes

        for (const [attribute, joiSchema] of Object.entries(resourceConfig.attributes)) {
            if (attribute === "id" || attribute === "type" || attribute === "meta") continue

            if(!joiSchema._settings) {
                const [schema, required] = this.#attributeSchema(joiSchema)
                attributeSchema[attribute] = schema
                if (required) {
                    if(!requiredAttributes) {
                        requiredAttributes = []
                    }
                    requiredAttributes.push(attribute)
                }
            } else if(!joiSchema._settings.as) {
                relationshipSchema[attribute] = this.#relationshipSchema(joiSchema)
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
     * @returns {{[resourceName: string]: jsonSchemaObject} & {error: jsonSchema}}
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