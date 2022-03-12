'use strict'

const graphqlHTTP = require('express-graphql').graphqlHTTP
const graphQl = require('graphql')

const filterArgsClass = require('./filterArgs')
const resolversClass = require('./resolvers')
const readTypesClass = require('./readTypes')
const writeArgsClass = require('./writeArgs')
const writeTypesClass = require('./writeTypes')
const joiConverterClass = require("./joiConverter")
const RetainsJsonApiPrivate = require('../RetainsJsonApiPrivate')

/**
 *
 */
class jsonApiGraphQLClass extends RetainsJsonApiPrivate {
    /**
     * @type {filterArgsClass}
     */
    filterArgs

    /**
     *
     */
    joiConverter = new joiConverterClass(this)

    /**
     * @type {readTypesClass}
     */
    readTypes

    /**
     * @type {resolversClass}
     */
    resolvers

    /**
     * @type {writeArgsClass}
     */
    writeArgs

    /**
     * @type {writeTypesClass}
     */
    writeTypes

    /**
     *
     * @param {*} jsonApi
     * @param {*} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)
        this.filterArgs = new filterArgsClass(this.jsonApi)
        this.readTypes = new readTypesClass(this.jsonApi, this.privateData)
        this.resolvers = new resolversClass(this.jsonApi, this.privateData)
        this.writeArgs = new writeArgsClass(this.jsonApi, this.joiConverter)
        this.writeTypes = new writeTypesClass(this.writeArgs)
    }

    /**
     *
     * @param {*} app
     */
    with(app) {
        const config = this.jsonApi._apiConfig

        if (config.graphiql !== false) {
            app.use(new RegExp(`${config.base}$`), graphqlHTTP({
                schema: this.generate(this.jsonApi._resources),
                graphiql: !!config.graphiql
            }))
        }
    }

    /**
     *
     * @param {*} allResourceConfig
     * @returns
     */
    generate(allResourceConfig) {
        const allReadTypes = this.readTypes.generate(allResourceConfig)
        const readSchema = this.generateReadSchema(allReadTypes, allResourceConfig)

        const allWriteTypes = this.writeTypes.generate(allResourceConfig, allReadTypes)
        const writeSchema = this.generateWriteSchema(allReadTypes, allResourceConfig, allWriteTypes)

        return new graphQl.GraphQLSchema({
            query: new graphQl.GraphQLObjectType({
                name: 'RootQueryType',
                fields: readSchema
            }),
            mutation: new graphQl.GraphQLObjectType({
                name: 'RootMutationType',
                fields: writeSchema
            })
        })
    }

    /**
     *
     * @param {*} allReadTypes
     * @param {*} allResourceConfig
     * @returns
     */
    generateReadSchema(allReadTypes, allResourceConfig) {
        const result = { }

        Object.keys(allResourceConfig).forEach(resource => {
            const resourceConfig = allResourceConfig[resource]

            result[resourceConfig.resource] = {
                description: `Get some ${resourceConfig.resource} resources`,
                args: this.filterArgs.generate(resource),
                type: new graphQl.GraphQLList(allReadTypes[resource]),
                resolve: this.resolvers.search.bind(this.resolvers, resourceConfig, null)
            }
        })
        return result
    }

    /**
     *
     * @param {*} allReadTypes
     * @param {*} allResourceConfig
     * @param {*} allWriteTypes
     * @returns
     */
    generateWriteSchema(allReadTypes, allResourceConfig, allWriteTypes) {
        const result = { }

        Object.keys(allResourceConfig).forEach(resource => {
            const resourceConfig = allResourceConfig[resource]

            let uName = resourceConfig.resource
            uName = uName[0].toUpperCase() + uName.substring(1)

            const args = { }
            args[resourceConfig.resource] = {
                type: allWriteTypes[resource]
            }

            result[`create${uName}`] = {
                description: `Create a new ${resourceConfig.resource} resource`,
                args,
                type: allReadTypes[resource],
                resolve: this.resolvers.create.bind(this.resolvers, resourceConfig)
            }

            result[`update${uName}`] = {
                description: `Update an existing ${resourceConfig.resource} resource`,
                args,
                type: allReadTypes[resource],
                resolve: this.resolvers.update.bind(this.resolvers, resourceConfig)
            }

            result[`delete${uName}`] = {
                description: `Delete a ${resourceConfig.resource} resource`,
                args: {
                    id: { type: new graphQl.GraphQLNonNull(graphQl.GraphQLString) }
                },
                type: allReadTypes[resource],
                resolve: this.resolvers.delete.bind(this.resolvers, resourceConfig)
            }
        })
        return result
    }
}

module.exports = jsonApiGraphQLClass