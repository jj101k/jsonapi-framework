"use strict"

const graphQl = require("graphql")

/**
 * @typedef {import("../../types/jsonApi").ResourceConfig} ResourceConfig
 */

/**
 *
 */
class WriteTypes {
    /**
     *
     * @param {ResourceConfig} resourceConfig
     * @param {{[key: string]: graphQl.GraphQLInputObjectType}} allWriteTypes
     * @returns
     */
    #createWriteType(resourceConfig, allWriteTypes) {
        return new graphQl.GraphQLInputObjectType({
            name: `${resourceConfig.resource}Write`,
            description: resourceConfig.description,
            fields: () => this.writeArgs.generate(resourceConfig.resource, allWriteTypes),
        })
    }

    /**
     *
     * @param {WriteArgs} writeArgs
     */
    constructor(writeArgs) {
        this.writeArgs = writeArgs
    }

    /**
     *
     * @param {{[key: string]: ResourceConfig}} allResourceConfig
     * @returns
     */
    generate(allResourceConfig) {
        /**
         * @type {{[key: string]: graphQl.GraphQLInputObjectType}}
         */
        const allWriteTypes = {}
        for(const [resource, resourceConfig] of Object.entries(allResourceConfig)) {
            allWriteTypes[resource] = this.#createWriteType(resourceConfig, allWriteTypes)
        }
        return allWriteTypes
    }
}

module.exports = WriteTypes