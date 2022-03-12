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
     *
     * @param {jsonApiGraphQLClass} jsonApiGraphQL
     */
    constructor(jsonApiGraphQL) {
        this.jsonApiGraphQL = jsonApiGraphQL
    }

    /**
     *
     * @param {*} joiScheme
     * @returns
     */
    simpleAttribute(joiScheme) {
        let type = joiScheme._type
        if (type === 'any') {
            // { _valids: { _set: [ 'M', 'F' ] } }
            type = typeof (joiScheme._valids._set || [ ])[0]
        }
        if (type === 'date') {
            type = 'string'
        }
        if (type === 'number') {
            type = 'float'
        }
        if (type === 'object') {
            type = 'objectType'
        }

        if (type === 'array') {
            if (joiScheme._inner.items.length === 1) {
                let joinSubType = this.simpleAttribute(joiScheme._inner.items[0])

                if (!joinSubType) {
                    throw new Error('Unable to parse Joi type, got ' + JSON.stringify(joiScheme))
                }

                return new graphQl.GraphQLList(graphQl.GraphQLString)
            } else {
                throw new Error('Joi arrays must contain a single type')
            }
        }

        const uType = type[0].toUpperCase() + type.substring(1)
        type = graphQl[`GraphQL${uType}`]

        if (!type) {
            throw new Error('Unable to parse Joi type, got ' + JSON.stringify(joiScheme))
        }
        return type
    }

    /**
     *
     * @param {*} joiScheme
     * @param {*} graphQlResources
     * @returns
     */
    swap(joiScheme, graphQlResources) {
        let type
        if (!joiScheme._settings) {
            type = this.simpleAttribute(joiScheme)
        } else {
            let otherType = joiScheme._settings.__one || joiScheme._settings.__many
            otherType = otherType.join(this.jsonApiGraphQL.readTypes.UNION_JOIN_CONST)
            type = graphQlResources[otherType]

            if (joiScheme._settings.__many) {
                type = new graphQl.GraphQLList(type)
            }
        }

        if ((joiScheme._flags || { }).presence === 'required') {
            type = new graphQl.GraphQLNonNull(type)
        }
        return type
    }

    /**
     *
     * @param {*} joiScheme
     * @returns
     */
    shallowInput(joiScheme) {
        let type
        if (!joiScheme._settings) {
            type = this.simpleAttribute(joiScheme)
        } else {
            type = oneRelationship
            if (joiScheme._settings.__many) {
                type = manyRelationship
            }
        }

        if ((joiScheme._flags || { }).presence === 'required') {
            type = new graphQl.GraphQLNonNull(type)
        }
        return type
    }
}

module.exports = joiConverterClass