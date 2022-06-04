"use strict"

const GraphQL = require("graphql")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const SchemaHelper = require("../SchemaHelper")
const Resolvers = require("./resolvers")
const UNION_JOIN_CONST = "_PluS_"

/**
 *
 */
class ReadTypes extends RetainsJsonApiPrivate {
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
         * @type {{[ref: string]: GraphQL.GraphQLObjectType}}
         */
        const singleReadTypes = {}
        /**
         * @type {{[ref: string]: GraphQL.GraphQLUnionType}}
         */
        const unionReadTypes = {}

        const resolvers = new Resolvers(this.jsonApi, this.privateData)
        const joiConverter = this.privateData.jsonApiGraphQL.joiConverter
        const filterArgs = this.privateData.jsonApiGraphQL.filterArgs

        for(const [resource, resourceConfig] of Object.entries(allResourceConfig)) {
            singleReadTypes[resource] = new GraphQL.GraphQLObjectType({
                name: resourceConfig.resource,
                description: resourceConfig.description,
                args: filterArgs.generate(resourceConfig.resource),
                fields() {
                    const allReadTypes = {...singleReadTypes, ...unionReadTypes}
                    return {
                        id: {
                            type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString),
                            description: "The UUID of the resource"
                        },
                        ...Object.fromEntries(
                            Object.entries(resourceConfig.attributes).filter(
                                ([attribute]) => attribute != "id" && attribute != "type" && attribute != "meta"
                            ).map(([attribute, joiSchema]) => {
                                const field = {
                                    type: joiConverter.swap(joiSchema, allReadTypes),
                                    description: SchemaHelper.description(joiSchema),
                                    resolve: resolvers.search.bind(resolvers, resourceConfig, attribute)
                                }
                                const singleRelationType = SchemaHelper.singleRelationType(joiSchema)
                                if (singleRelationType) {
                                    field.args = filterArgs.generate([singleRelationType])
                                }
                                return [attribute, field]
                            })
                        )
                    }
                }
            })

            for(const joiSchema of Object.values(resourceConfig.attributes)) {
                const multipleRelationTypes = SchemaHelper.multipleRelationTypes(joiSchema)
                if (multipleRelationTypes) {
                    const unionType = multipleRelationTypes.join(UNION_JOIN_CONST)
                    if (!unionReadTypes[unionType]) {
                        unionReadTypes[unionType] = new GraphQL.GraphQLUnionType({
                            name: unionType,
                            types: multipleRelationTypes.map(a => singleReadTypes[a]),
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

        return {...singleReadTypes, ...unionReadTypes}
    }
}

module.exports = ReadTypes