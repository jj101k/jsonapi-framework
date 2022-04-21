"use strict"

const graphQl = require("graphql")
const RetainsJsonApi = require("../RetainsJsonApi")

/**
 *
 */
class FilterArgs extends RetainsJsonApi {
    /**
     *
     * @param {string} resource
     * @returns
     */
    generate(resource) {
        return Object.fromEntries(
            Object.keys(this.jsonApi._resources[resource].attributes).map(
                attribute => [
                    attribute,
                    {
                        description: "Filter string",
                        type: graphQl.GraphQLString
                    }
                ]
            )
        )
    }
}

module.exports = FilterArgs