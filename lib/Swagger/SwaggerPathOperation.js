/**
 * @typedef {import("../../types/Handler").handlerName} handlerName
 */

/**
 *
 */
class SwaggerPathOperation {
    /**
     * @type {string[] | undefined}
     */
    #extraTags

    /**
     * @type {handlerName}
     */
    #handler

    /**
     * @type {boolean}
     */
    #hasPathId

    /**
     * @type {any}
     */
    #relation

    /**
     * @type {"many" | "one" | undefined}
     */
    #relationType

    /**
     * @type {string}
     */
    #resourceName

    /**
     * @type {import("openapi3-ts").SchemaObject | undefined}
     */
    get #included() {
        if((this.#handler === "search" || this.#handler === "find") && !this.#relation) {
            return {
                type: "array",
                items: {
                    type: "object"
                }
            }
        } else {
            return undefined
        }
    }

    /**
     *
     * @returns {import("openapi3-ts").SchemaObject}
     */
    get #relationModel() {
        return {
            type: "object",
            required: ["type", "id"],

            properties: {
                type: {type: "string"},
                id: {type: "string"},
                meta: {type: "object"}
            }
        }
    }

    /**
     *
     */
    get #successCode() {
        if (this.#handler === "create") {
            return 201
        } else {
            return 200
        }
    }

    /**
     * @type {import("openapi3-ts").SchemaObject |
     * import("openapi3-ts").ReferenceObject | undefined}
     */
    get #successDataType() {
        if (this.#relationType) {
            const relationSchema = this.#relationModel
            if (this.#relationType === "many") {
                return {
                    type: "array",
                    items: relationSchema
                }
            } else {
                return relationSchema
            }
        } else if (this.#handler === "search") {
            return {
                type: "array",
                items: {
                    $ref: `#/definitions/${this.#resourceName}`
                }
            }
        } else if (this.#handler === "delete") {
            return undefined
        } else {
            return {
                $ref: `#/definitions/${this.#resourceName}`
            }
        }
    }

    /**
     * @type {string}
     */
    description

    /**
     *
     */
    get parameters() {
        /**
         * @type {import("openapi3-ts").ReferenceObject[]}
         */
        let handlerParameters
        if (((this.#handler === "search") || (this.#handler === "find")) && !this.#relation) {
            handlerParameters = [
                {$ref: "#/parameters/sort"},
                {$ref: "#/parameters/include"},
                {$ref: "#/parameters/filter"},
                {$ref: "#/parameters/fields"},
                {$ref: "#/parameters/page"}
            ]
        } else {
            handlerParameters = []
        }

        /**
         * @type {import("openapi3-ts").ParameterObject[]}
         */
        let pathParameters
        if (this.#hasPathId) {
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

        return [...pathParameters, ...handlerParameters]
    }

    /**
     *
     */
    get requestBody() {
        if(
            (this.#handler === "delete" && !this.#relationType) ||
            (this.#handler !== "create" && this.#handler !== "update" && this.#handler !== "delete")
        ) {
            return undefined
        }

        /**
         * @type {import("openapi3-ts").SchemaObject}
         */
        let schema

        if (this.#relationType && (this.#handler === "create" || this.#handler === "update")) {
            if ((this.#handler === "update") && (this.#relationType === "many")) {
                schema = {
                    type: "array",
                    items: this.#relationModel,
                }
            } else {
                schema = this.#relationModel
            }
        } else if (this.#relationType && this.#handler === "delete") {
            schema = this.#relationModel
        } else {
            schema = {
                type: "object",
                properties: {
                    data: {
                        $ref: `#/definitions/${this.#resourceName}`
                    }
                }
            }
        }

        return {
            description: "New or partial resource",
            content: {
                "application/json": {schema},
                "application/vnd.api+json": {schema},
            },
            required: true,
        }
    }

    /**
     *
     */
    get responses() {
        return {
            [this.#successCode]: {
                description: `${this.#resourceName} ${this.#handler} response`,
                schema: {
                    type: "object",
                    required: ["jsonapi", "meta", "links"],
                    properties: {
                        jsonapi: {
                            type: "object",
                            required: ["version"],
                            properties: {
                                version: {type: "string"}
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
                        data: this.#successDataType,
                        included: this.#included,
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

    /**
     *
     */
    get tags() {
        if(this.#extraTags) {
            return [...new Set([this.#resourceName, ...this.#extraTags]).values()]
        } else {
            return [this.#resourceName]
        }
    }

    /**
     *
     * @param {{description: string, extraTags?: string[], handler: handlerName,
     * hasPathId: boolean, relation?: any, relationType?: "many" | "one",
     * resourceName: string}} options
     */
    constructor(options) {
        this.#extraTags = options.extraTags
        this.#handler = options.handler
        this.#hasPathId = options.hasPathId
        this.#relation = options.relation
        this.#relationType = options.relationType
        this.#resourceName = options.resourceName
        this.description = options.description
    }

    /**
     *
     * @returns {import("openapi3-ts").OperationObject}
     */
    toJSON() {
        // TODO: there was a section for extra parameters here, but it never worked

        return {
            tags: this.tags,
            description: this.description,
            parameters: this.parameters,
            requestBody: this.requestBody,
            responses: this.responses,
        }
    }
}

module.exports = SwaggerPathOperation