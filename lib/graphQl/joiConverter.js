'use strict'
const graphQl = require('graphql')

const oneRelationship = new graphQl.GraphQLInputObjectType({
    name: 'oneRelationship',
    fields: {
        id: {
            type: new graphQl.GraphQLNonNull(graphQl.GraphQLString),
            description: 'The UUID of another resource'
        }
    }
})
const manyRelationship = new graphQl.GraphQLList(oneRelationship)

/**
 *
 */
class joiConverterClass {
    /**
     * @type {readTypes}
     */
    #readTypes

    /**
     *
     * @param {string} type
     * @param {import("joi").Schema} joiSchema
     * @returns
     */
    #possiblyNullable(type, joiSchema) {
        if ((joiSchema._flags || {}).presence === 'required') {
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
            if(items.length === 1) {
                const joinSubType = this.#simpleAttribute(items[0])

                if (!joinSubType) {
                    throw new Error('Unable to parse Joi type, got ' + JSON.stringify(joiSchema))
                }

                return new graphQl.GraphQLList(graphQl.GraphQLString)
            } else {
                throw new Error('Joi arrays must contain a single type')
            }
        }
        /**
         * @type {string}
         */
        let type
        switch(joiSchema._type) {
            case "any":
                // { _valids: { _set: [ 'M', 'F' ] } }
                type = typeof (joiSchema._valids._set || [])[0]
                break
            case "date":
                type = 'string'
                break
            case "number":
                type = 'float'
                break
            case "object":
                type = 'objectType'
                break
            default:
                type = joiSchema._type
        }

        const graphQlType = graphQl[`GraphQL${type.replace(/^(\w)/, (a, $1) => $1.toUpperCase())}`]

        if (!graphQlType) {
            throw new Error('Unable to parse Joi type, got ' + JSON.stringify(joiSchema))
        }
        return graphQlType
    }

    /**
     *
     * @param {readTypesClass} readTypes
     */
    constructor(readTypes) {
        this.#readTypes = readTypes
    }

    /**
     *
     * @param {import("joi").Schema} joiSchema
     * @param {{[key: string]: graphQl.GraphQLType}} graphQlResources
     * @returns
     */
    swap(joiSchema, graphQlResources) {
        let type
        if (!joiSchema._settings) {
            type = this.#simpleAttribute(joiSchema)
        } else {
            const otherType = (joiSchema._settings.__one || joiSchema._settings.__many)
                .join(this.#readTypes.UNION_JOIN_CONST)

            if (joiSchema._settings.__many) {
                type = new graphQl.GraphQLList(graphQlResources[otherType])
            } else {
                type = graphQlResources[otherType]
            }
        }

        return this.#possiblyNullable(type, joiSchema)
    }

    /**
     *
     * @param {import("joi").Schema} joiSchema
     * @returns
     */
    shallowInput(joiSchema) {
        let type
        if (!joiSchema._settings) {
            type = this.#simpleAttribute(joiSchema)
        } else {
            if (joiSchema._settings.__many) {
                type = manyRelationship
            } else {
                type = oneRelationship
            }
        }

        return this.#possiblyNullable(type, joiSchema)
    }
}

module.exports = joiConverterClass