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
     * @type {{[javascriptType: string]: graphQl.GraphQLScalarType | typeof graphQl.GraphQLObjectType}}
     */
    static #javascriptTypeToGraphQL = {
        bigint: graphQl.GraphQLFloat,
        boolean: graphQl.GraphQLBoolean,
        number: graphQl.GraphQLFloat,
        object: graphQl.GraphQLObjectType,
        string: graphQl.GraphQLString,
    }

    /**
     * @type {{[joiType: string]: graphQl.GraphQLScalarType | typeof graphQl.GraphQLObjectType}}
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
     * @param {graphQl.GraphQLNullableType} type
     * @param {SchemaHelper} helper
     * @returns
     */
    #possiblyNullable(type, helper) {
        if (helper.isRequired) {
            return new graphQl.GraphQLNonNull(type)
        } else {
            return type
        }
    }

    /**
     *
     * @param {SchemaHelper} helper
     * @returns
     */
    #simpleAttribute(helper) {
        if (helper.type == "array") {
            if (!this.#simpleAttribute(helper.arrayItemTypeHelper)) {
                throw new Error(`Unable to parse Joi type, got (array) ${helper}`)
            }

            return new graphQl.GraphQLList(graphQl.GraphQLString)
        } else if(helper.type == "any") {
            // This just returns the primitive type used here.
            const allowedValues = helper.allowedValues
            const type = JoiConverter.#javascriptTypeToGraphQL[typeof allowedValues[0]]
            if(!type) {
                throw new Error("Unable to parse Javascript type for 'any', given " + JSON.stringify(allowedValues))
            }
            return type
        } else {
            const type = JoiConverter.#joiSingleTypeToGraphQL[helper.type ?? ""]
            if(!type) {
                throw new Error(`Unable to parse Joi type, got ${helper}`)
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
        const helper = SchemaHelper.for(joiSchema)
        const relationTypeCodes = helper.relationTypeCodes
        if(relationTypeCodes) {
            const otherType = relationTypeCodes.join(this.#readTypes.UNION_JOIN_CONST)
            type = helper.isToOneRelationship ?
                graphQlResources[otherType] :
                new graphQl.GraphQLList(graphQlResources[otherType])
            return this.#possiblyNullable(type, helper)
        } else {
            type = this.#simpleAttribute(helper)
            return this.#possiblyNullable(type, helper)
        }
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    shallowInput(joiSchema) {
        const helper = SchemaHelper.for(joiSchema)
        if(helper.isToOneRelationship) {
            return this.#possiblyNullable(JoiConverter.#oneRelationship, helper)
        } else if(helper.isToManyRelationship) {
            return this.#possiblyNullable(JoiConverter.#manyRelationship, helper)
        } else {
            const type = this.#simpleAttribute(helper)
            return this.#possiblyNullable(type, helper)
        }
    }
}

module.exports = JoiConverter