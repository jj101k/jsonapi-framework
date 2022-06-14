"use strict"

const graphqlHTTP = require("express-graphql").graphqlHTTP
const graphQl = require("graphql")

const FilterArgs = require("./FilterArgs")
const JoiConverter = require("./JoiConverter")
const ReadTypes = require("./ReadTypes")
const Resolvers = require("./resolvers")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const WriteArgs = require("./writeArgs")
const WriteTypes = require("./writeTypes")

/**
 * @typedef {import("../../types/jsonApi").ResourceConfig} ResourceConfig
 */

/**
 *
 */
class JsonApiGraphQL extends RetainsJsonApiPrivate {
    /**
     * @type {Resolvers}
     */
    #resolvers

    /**
     * @type {WriteTypes}
     */
    #writeTypes

    /**
     *
     * @param {{[key: string]: ResourceConfig}} allResourceConfig
     * @returns
     */
    #generate(allResourceConfig) {
        const allReadTypes = this.readTypes.generate(allResourceConfig)
        const readSchema = this.#generateReadSchema(allReadTypes, allResourceConfig)

        const allWriteTypes = this.#writeTypes.generate(allResourceConfig)
        const writeSchema = this.#generateWriteSchema(allReadTypes, allResourceConfig, allWriteTypes)

        return new graphQl.GraphQLSchema({
            query: new graphQl.GraphQLObjectType({
                name: "RootQueryType",
                fields: readSchema,
            }),
            mutation: new graphQl.GraphQLObjectType({
                name: "RootMutationType",
                fields: writeSchema,
            }),
        })
    }

    /**
     *
     * @param {{[key: string]: *}} allReadTypes
     * @param {{[key: string]: ResourceConfig}} allResourceConfig
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
     * @param {{[key: string]: ResourceConfig}} allResourceConfig
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
     * @type {FilterArgs}
     */
    filterArgs

    /**
     * @type {JoiConverter}
     */
    joiConverter

    /**
     * @type {ReadTypes}
     */
    readTypes

    /**
     *
     * @param {import("../jsonApi")} jsonApi
     * @param {import("../jsonApiPrivate")} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)

        const readTypes = new ReadTypes(jsonApi, privateData)
        const joiConverter = new JoiConverter(readTypes)
        const writeArgs = new WriteArgs(jsonApi, joiConverter)

        this.#resolvers = new Resolvers(jsonApi, privateData)
        this.#writeTypes = new WriteTypes(writeArgs)

        this.filterArgs = new FilterArgs(jsonApi)
        this.readTypes = readTypes
        this.joiConverter = joiConverter
    }

    /**
     *
     * @param {import("express").Express} app
     */
    with(app) {
        const config = this.jsonApi._apiConfig

        if (config.graphiql !== false) {
            if(config.base === undefined) {
                throw new Error("config.base must be defined")
            }
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

module.exports = JsonApiGraphQL