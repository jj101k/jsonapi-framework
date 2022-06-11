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
        if (SchemaHelper.for(joiSchema).isRequired) {
            return new graphQl.GraphQLNonNull(type)
        } else {
            return type
        }
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    #simpleAttribute(joiSchema) {
        const helper = SchemaHelper.for(joiSchema)
        if (helper.type == "array") {
            if (!this.#simpleAttribute(helper.arrayItemType)) {
                throw new Error(`Unable to parse Joi type, got (array) ${helper.debugString}`)
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
            const type = JoiConverter.#joiSingleTypeToGraphQL[helper.type]
            if(!type) {
                throw new Error(`Unable to parse Joi type, got ${helper.debugString}`)
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
        if(helper.isRelationship) {
            const otherType = helper.relationTypeCodes.join(this.#readTypes.UNION_JOIN_CONST)
            type = helper.isToOneRelationship ?
                graphQlResources[otherType] :
                new graphQl.GraphQLList(graphQlResources[otherType])
        } else {
            type = this.#simpleAttribute(joiSchema)
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
        const helper = SchemaHelper.for(joiSchema)
        if(helper.isToOneRelationship) {
            type = JoiConverter.#oneRelationship
        } else if(helper.isToManyRelationship) {
            type = JoiConverter.#manyRelationship
        } else {
            type = this.#simpleAttribute(joiSchema)
        }

        return this.#possiblyNullable(type, joiSchema)
    }
}

module.exports = JoiConverter