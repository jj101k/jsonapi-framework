'use strict'

const graphQl = require('graphql')

/**
 *
 */
class writeTypesClass {
    /**
     *
     * @param {writeArgsClass} writeArgs
     */
    constructor(writeArgs) {
        this.writeArgs = writeArgs
    }

    /**
     *
     * @param {*} allResourceConfig
     * @returns
     */
    generate(allResourceConfig) {
        const allWriteTypes = { }
        Object.keys(allResourceConfig).forEach(resource => {
            allWriteTypes[resource] = this.createWriteType(allResourceConfig[resource], allWriteTypes)
        })
        return allWriteTypes
    }

    /**
     *
     * @param {*} resourceConfig
     * @param {*} allWriteTypes
     * @returns
     */
    createWriteType(resourceConfig, allWriteTypes) {
        const someType = {
            name: `${resourceConfig.resource}Write`,
            description: resourceConfig.description,
            fields: () => {
                return this.writeArgs.generate(resourceConfig.resource, allWriteTypes)
            }
        }

        return new graphQl.GraphQLInputObjectType(someType)
    }
}

module.exports = writeTypesClass