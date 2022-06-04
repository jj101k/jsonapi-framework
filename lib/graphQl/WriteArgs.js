"use strict"
const graphQl = require("graphql")
const RetainsJsonApi = require("../RetainsJsonApi")
const SchemaHelper = require("../SchemaHelper")

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
     * @param {string} resource
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
                        !SchemaHelper.isBelongsToRelationship(joiSchema)
                ).map(([attribute, joiSchema]) => [
                    attribute,
                    {
                        type: this.joiConverter.shallowInput(joiSchema),
                        description: SchemaHelper.description(joiSchema),
                    }
                ])
            )
        }
    }
}

module.exports = WriteArgs