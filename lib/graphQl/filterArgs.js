'use strict'

const graphQl = require('graphql')
const RetainsJsonApi = require('../RetainsJsonApi')

/**
 *
 */
class filterArgsClass extends RetainsJsonApi {
    /**
     *
     * @param {*} resource
     * @returns
     */
    generate(resource) {
        const args = { }
        const resourceConfig = this.jsonApi._resources[resource]
        Object.keys(resourceConfig.attributes).forEach(attribute => {
            args[attribute] = {
                description: 'Filter string',
                type: graphQl.GraphQLString
            }
        })
        return args
    }
}

module.exports = filterArgsClass