"use strict"
const graphQl = require("graphql")
const RetainsJsonApi = require("../RetainsJsonApi")

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
     * @param {import("../../types/jsonApi").ResourceConfig} resource
     * @param {*} allWriteTypes
     * @returns
     */
    generate(resource, allWriteTypes) {
        const resourceConfig = this.jsonApi._resources[resource]
        return {
            id: {type: graphQl.GraphQLString},
            ...Object.fromEntries(
                Object.entries(resourceConfig.attributes).filter(
                    ([attribute, joiSchema]) => attribute != "id" && attribute != "type" && attribute != "meta" &&
                        !joiSchema._settings?.__as
                ).map(([attribute, joiSchema]) => [
                    attribute,
                    {
                        type: this.joiConverter.shallowInput(joiSchema, allWriteTypes),
                        description: joiSchema._description,
                    }
                ])
            )
        }
    }
}

module.exports = writeArgsClass