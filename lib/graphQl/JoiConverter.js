"use strict"
const graphQl = require("graphql")
const SchemaHelper = require("../SchemaHelper")

/**
 * @typedef {import("joi").Schema} Schema
 */

/**
 *
 */
class JoiConverter {
    /**
     *
     */
    static #oneRelationship = new graphQl.GraphQLInputObjectType({
        name: "oneRelationship",
        fields: {
            id: {
                type: new graphQl.GraphQLNonNull(graphQl.GraphQLString),
                description: "The UUID of another resource"
            }
        }
    })

    /**
     * @type {{[javascriptType: string]: graphQl.GraphQLScalarType}}
     */
    static #javascriptTypeToGraphQL = {
        bigint: graphQl.GraphQLFloat,
        boolean: graphQl.GraphQLBoolean,
        number: graphQl.GraphQLFloat,
        object: graphQl.GraphQLObjectType,
        string: graphQl.GraphQLString,
    }

    /**
     * @type {{[joiType: string]: graphQl.GraphQLScalarType}}
     */
    static #joiSingleTypeToGraphQL = {
        boolean: graphQl.GraphQLBoolean,
        date: graphQl.GraphQLString,
        number: graphQl.GraphQLFloat,
        object: graphQl.GraphQLObjectType,
        string: graphQl.GraphQLString,
    }

    /**
     *
     */
    static #manyRelationship = new graphQl.GraphQLList(this.#oneRelationship)

    /**
     * @type {import("./ReadTypes")}
     */
    #readTypes

    /**
     * Returns an expression of "type or null" if the schema permits, or "type" otherwise.
     *
     * @param {string} type
     * @param {Schema} joiSchema
     * @returns
     */
    #possiblyNullable(type, joiSchema) {
        if ((joiSchema._flags || {}).presence === "required") {
            return new graphQl.GraphQLNonNull(type)
        } else {
            return type
        }
    }

    /**
     *
     * @param {import("joi").Schema} joiSchema
     * @returns
     */
    #simpleAttribute(joiSchema) {
        if (joiSchema._type == "array") {
            const items = joiSchema._inner.items
            if(items.length != 1) {
                throw new Error("Joi arrays must contain a single type")
            }
            if(items.length === 1) {
                if (!this.#simpleAttribute(items[0])) {
                    throw new Error("Unable to parse Joi type, got " + JSON.stringify(joiSchema))
                }

                return new graphQl.GraphQLList(graphQl.GraphQLString)
            } else {
                throw new Error("Joi arrays must contain a single type")
            }
        } else if(joiSchema._type == "any") {
            // { _valids: { _set: [ 'M', 'F' ] } }
            const type = JoiConverter.#javascriptTypeToGraphQL[typeof (joiSchema._valids._set || [])[0]]
            if(!type) {
                throw new Error("Unable to parse Javascript type for 'any', given " + JSON.stringify(joiSchema._valids._set))
            }
            return type
        } else {
            const type = JoiConverter.#joiSingleTypeToGraphQL[joiSchema._type]
            if(!type) {
                throw new Error("Unable to parse Joi type, got " + JSON.stringify(joiSchema))
            }
            return type
        }
    }

    /**
     *
     * @param {import("./ReadTypes")} readTypes
     */
    constructor(readTypes) {
        this.#readTypes = readTypes
    }

    /**
     *
     * @param {Schema} joiSchema
     * @param {{[key: string]: graphQl.GraphQLType}} graphQlResources
     * @returns
     */
    swap(joiSchema, graphQlResources) {
        let type
        if (!SchemaHelper.isRelationship(joiSchema)) {
            type = this.#simpleAttribute(joiSchema)
        } else if(SchemaHelper.isToManyRelationship(joiSchema)) {
            const otherType = joiSchema._settings.__many.join(this.#readTypes.UNION_JOIN_CONST)
            type = new graphQl.GraphQLList(graphQlResources[otherType])
        } else {
            const otherType = joiSchema._settings.__one.join(this.#readTypes.UNION_JOIN_CONST)
            type = graphQlResources[otherType]
        }

        return this.#possiblyNullable(type, joiSchema)
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    shallowInput(joiSchema) {
        let type
        if(!SchemaHelper.isRelationship(joiSchema)) {
            type = this.#simpleAttribute(joiSchema)
        } else if(SchemaHelper.isToManyRelationship(joiSchema)) {
            type = JoiConverter.#manyRelationship
        } else {
            type = JoiConverter.#oneRelationship
        }

        return this.#possiblyNullable(type, joiSchema)
    }
}

module.exports = JoiConverter