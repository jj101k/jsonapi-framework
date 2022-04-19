"use strict"

const graphQl = require("graphql")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const resolversClass = require("./resolvers")
const UNION_JOIN_CONST = "_PluS_"

/**
 *
 */
class readTypesClass extends RetainsJsonApiPrivate {
    /**
     *
     */
    UNION_JOIN_CONST = UNION_JOIN_CONST

    /**
     *
     * @param {{[resource: string]: import("../../types/jsonApi").ResourceConfig}} allResourceConfig
     * @returns
     */
    generate(allResourceConfig) {
        /**
         * @type {{[ref: string]: *}}
         */
        const singleReadTypes = {}
        /**
         * @type {{[ref: string]: *}}
         */
        const unionReadTypes = {}

        const resolvers = new resolversClass(this.jsonApi, this.privateData)
        const joiConverter = this.privateData.jsonApiGraphQL.joiConverter
        const filterArgs = this.privateData.jsonApiGraphQL.filterArgs

        for(const [resource, resourceConfig] of Object.entries(allResourceConfig)) {
            singleReadTypes[resource] = new graphQl.GraphQLObjectType({
                name: resourceConfig.resource,
                description: resourceConfig.description,
                args: filterArgs.generate(resourceConfig.resource),
                fields() {
                    const allReadTypes = {...singleReadTypes, ...unionReadTypes}
                    return {
                        id: {
                            type: new graphQl.GraphQLNonNull(graphQl.GraphQLString),
                            description: "The UUID of the resource"
                        },
                        ...Object.fromEntries(
                            Object.entries(resourceConfig.attributes).filter(
                                ([attribute]) => attribute != "id" && attribute != "type" && attribute != "meta"
                            ).map(([attribute, joiSchema]) => {
                                const field = {
                                    type: joiConverter.swap(joiSchema, allReadTypes),
                                    description: joiSchema._description,
                                    resolve: resolvers.search.bind(resolvers, resourceConfig, attribute)
                                }
                                if (joiSchema._settings) {
                                    const otherResource = joiSchema._settings.__one || joiSchema._settings.__many
                                    if (otherResource.length === 1) {
                                        field.args = filterArgs.generate(otherResource)
                                    }
                                }
                                return [attribute, field]
                            })
                        )
                    }
                }
            })

            for(const joiSchema of Object.values(resourceConfig.attributes)) {
                if (joiSchema._settings) {
                    const otherResource = joiSchema._settings.__one || joiSchema._settings.__many
                    if (otherResource.length > 1) {
                        const unionType = otherResource.join(UNION_JOIN_CONST)
                        if (!unionReadTypes[unionType]) {
                            unionReadTypes[unionType] = new graphQl.GraphQLUnionType({
                                name: unionType,
                                types: otherResource.map(a => singleReadTypes[a]),
                                /**
                                 *
                                 * @param {{type: string}} value
                                 * @returns
                                 */
                                resolveType(value) {
                                    return value.type
                                },
                            })
                        }
                    }
                }
            }
        }

        return {...singleReadTypes, ...unionReadTypes}
    }
}

module.exports = readTypesClass