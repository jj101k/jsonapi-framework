"use strict"

/**
 *
 */
class resourcesClass {
    /**
     *
     * @returns
     */
    #getErrorDefinition() {
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
     * @param {*} resourceConfig
     * @returns
     */
    #getResourceDefinition(resourceConfig) {
        if (Object.keys(resourceConfig.handlers || { }).length === 0) return undefined

        const attributeSchema = {}
        const relationshipSchema = {}
        let requiredAttributes

        const attributes = resourceConfig.attributes
        for (const attribute in attributes) {
            if ((attribute === "id") || (attribute === "type") || (attribute === "meta")) continue

            const joiSchema = attributes[attribute]

            if (!joiSchema._settings) {
                const description = joiSchema._description || undefined
                if (joiSchema._type === "date") {
                    attributeSchema[attribute] = {
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
                    attributeSchema[attribute] = {
                        type: "array",
                        items: {
                            type: "object",
                            properties,
                        },
                        description,
                    }
                } else {
                    attributeSchema[attribute] = {
                        type: joiSchema._type,
                        description,
                    }
                }

                if ((joiSchema._flags || { }).presence === "required") {
                    if(!requiredAttributes) {
                        requiredAttributes = []
                    }
                    requiredAttributes.push(attribute)
                }
            } else if (!joiSchema._settings.as) {
                let required
                if ((joiSchema._flags || { }).presence === "required") {
                    if (joiSchema._settings.__many) {
                        required = true
                    } else {
                        required = ["type", "id"]
                    }
                }

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

                relationshipSchema[attribute] = {
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
     * @param {*} resources
     */
    constructor(resources) {
        this.resources = resources
    }

    /**
     *
     * @returns
     */
    getResourceDefinitions() {
        return {
            ...Object.fromEntries(
                Object.entries(this.resources).map(([resource, config]) => [resource, this.#getResourceDefinition(config)])
            ),
            error: this.#getErrorDefinition(),
        }
    }
}

module.exports = resourcesClass