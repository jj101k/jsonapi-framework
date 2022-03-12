'use strict'
const graphQl = require('graphql')
const RetainsJsonApi = require('../RetainsJsonApi')

/**
 *
 */
class writeArgsClass extends RetainsJsonApi {
    /**
     *
     * @param {jsonApiClass} jsonApi
     * @param {joiConverterClass} joiConverter
     */
    constructor(jsonApi, joiConverter) {
        super(jsonApi)
        this.jsonApi = jsonApi
        this.joiConverter = joiConverter
    }

    /**
     *
     * @param {*} resource
     * @param {*} allWriteTypes
     * @returns
     */
    generate(resource, allWriteTypes) {
        const args = {
            id: { type: graphQl.GraphQLString }
        }
        const resourceConfig = this.jsonApi._resources[resource]
        Object.keys(resourceConfig.attributes).forEach(attribute => {
            if ((attribute === 'id') || (attribute === 'type') || (attribute === 'meta')) return

            const joiScheme = resourceConfig.attributes[attribute]
            if (joiScheme._settings && joiScheme._settings.__as) return

            args[attribute] = {
                type: this.joiConverter.shallowInput(joiScheme, allWriteTypes),
                description: joiScheme._description
            }
        })
        return args
    }
}

module.exports = writeArgsClass