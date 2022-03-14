'use strict'

const graphqlHTTP = require('express-graphql').graphqlHTTP
const graphQl = require('graphql')

const filterArgsClass = require("./filterArgs")
const joiConverterClass = require("./joiConverter")
const readTypesClass = require("./readTypes")
const resolversClass = require("./resolvers")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const writeArgsClass = require("./writeArgs")
const writeTypesClass = require("./writeTypes")
const jsonApi = require('../jsonApi')
const jsonApiPrivate = require('../jsonApiPrivate')

/**
 *
 */
class jsonApiGraphQLClass extends RetainsJsonApiPrivate {
    /**
     * @type {resolversClass}
     */
    #resolvers

    /**
     * @type {writeTypesClass}
     */
    #writeTypes

    /**
     *
     * @param {{[key: string]: import("../../types/jsonApi").ResourceConfig}} allResourceConfig
     * @returns
     */
     #generate(allResourceConfig) {
        const allReadTypes = this.readTypes.generate(allResourceConfig)
        const readSchema = this.#generateReadSchema(allReadTypes, allResourceConfig)

        const allWriteTypes = this.#writeTypes.generate(allResourceConfig, allReadTypes)
        const writeSchema = this.#generateWriteSchema(allReadTypes, allResourceConfig, allWriteTypes)

        return new graphQl.GraphQLSchema({
            query: new graphQl.GraphQLObjectType({
                name: 'RootQueryType',
                fields: readSchema,
            }),
            mutation: new graphQl.GraphQLObjectType({
                name: 'RootMutationType',
                fields: writeSchema,
            }),
        })
    }

    /**
     *
     * @param {{[key: string]: *}} allReadTypes
     * @param {{[key: string]: import("../../types/jsonApi").ResourceConfig}} allResourceConfig
     * @returns
     */
    #generateReadSchema(allReadTypes, allResourceConfig) {
        return Object.fromEntries(
            Object.entries(allResourceConfig).map(([resource, resourceConfig]) => [
                resourceConfig.resource,
                {
                    description: `Get some ${resourceConfig.resource} resources`,
                    args: this.filterArgs.generate(resource),
                    type: new graphQl.GraphQLList(allReadTypes[resource]),
                    resolve: this.#resolvers.search.bind(this.#resolvers, resourceConfig, null)
                }
            ])
        )
    }

    /**
     *
     * @param {{[key: string]: *}} allReadTypes
     * @param {{[key: string]: import("../../types/jsonApi").ResourceConfig}} allResourceConfig
     * @param {{[key: string]: *}} allWriteTypes
     * @returns
     */
    #generateWriteSchema(allReadTypes, allResourceConfig, allWriteTypes) {
        const entries = Object.entries(allResourceConfig).map(
            ([resource, resourceConfig]) => ({
                /**
                 *
                 * @param {Function} f
                 * @returns {Function}
                 */
                bindResolve: (f) => f.bind(this.#resolvers, resourceConfig),
                resourceConfig,
                type: allReadTypes[resource],
                ucName: resourceConfig.resource.replace(/^(\w)/, (a, $1) => $1.toUpperCase()),
                writeArgs: {
                    [resourceConfig.resource]: {
                        type: allWriteTypes[resource],
                    },
                },
            })
        )
        return Object.fromEntries([
            ...entries.map(
                ({bindResolve, resourceConfig, type, ucName, writeArgs}) => [
                    `create${ucName}`,
                    {
                        description: `Create a new ${resourceConfig.resource} resource`,
                        args: writeArgs,
                        type,
                        resolve: bindResolve(this.#resolvers.create),
                    }
                ]
            ),
            ...entries.map(
                ({bindResolve, resourceConfig, type, ucName, writeArgs}) => [
                    `update${ucName}`,
                    {
                        description: `Update an existing ${resourceConfig.resource} resource`,
                        args: writeArgs,
                        type,
                        resolve: bindResolve(this.#resolvers.update),
                    }
                ]
            ),
            ...entries.map(
                ({bindResolve, resourceConfig, type, ucName}) => [
                    `delete${ucName}`,
                    {
                        description: `Delete a ${resourceConfig.resource} resource`,
                        args: {id: {type: new graphQl.GraphQLNonNull(graphQl.GraphQLString)}},
                        type,
                        resolve: bindResolve(this.#resolvers.delete),
                    }
                ]
            ),
        ])
    }

    /**
     * @type {filterArgsClass}
     */
    filterArgs

    /**
     * @type {joiConverterClass}
     */
    joiConverter

    /**
     * @type {readTypesClass}
     */
    readTypes

    /**
     *
     * @param {jsonApi} jsonApi
     * @param {jsonApiPrivate} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)

        const readTypes = new readTypesClass(jsonApi, privateData)
        const joiConverter = new joiConverterClass(readTypes)
        const writeArgs = new writeArgsClass(jsonApi, joiConverter)

        this.#resolvers = new resolversClass(jsonApi, privateData)
        this.#writeTypes = new writeTypesClass(writeArgs)

        this.filterArgs = new filterArgsClass(jsonApi)
        this.readTypes = readTypes
        this.joiConverter = joiConverter
    }

    /**
     *
     * @param {*} app
     */
    with(app) {
        const config = this.jsonApi._apiConfig

        if (config.graphiql !== false) {
            const baseEscaped = config.base.replace(/([.?+])/g, "\\$1")
            app.use(
                new RegExp(`${baseEscaped}$`),
                graphqlHTTP({
                    schema: this.#generate(this.jsonApi._resources),
                    graphiql: !!config.graphiql,
                })
            )
        }
    }
}

module.exports = jsonApiGraphQLClass