"use strict"
const graphQl = require("graphql")
const RetainsJsonApi = require("../RetainsJsonApi")

/**
 *
 */
class WriteArgs extends RetainsJsonApi {
    /**
     *
     * @param {import("../jsonApi")} jsonApi
     * @param {import("./JoiConverter")} joiConverter
     */
    constructor(jsonApi, joiConverter) {
        super(jsonApi)
        this.jsonApi = jsonApi
        this.joiConverter = joiConverter
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resource
     * @param {{[key: string]: graphQl.GraphQLInputObjectType}} allWriteTypes
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
                        type: this.joiConverter.shallowInput(joiSchema),
                        description: joiSchema._description,
                    }
                ])
            )
        }
    }
}

module.exports = WriteArgs