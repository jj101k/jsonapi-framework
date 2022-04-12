"use strict"

const graphQl = require("graphql")

/**
 *
 */
class writeTypesClass {
    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
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
     * @param {writeArgsClass} writeArgs
     */
    constructor(writeArgs) {
        this.writeArgs = writeArgs
    }

    /**
     *
     * @param {{[key: string]: import("../../types/jsonApi").ResourceConfig}} allResourceConfig
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

module.exports = writeTypesClass