"use strict"

const SchemaHelper = require("./SchemaHelper")

/**
 *
 */
class schemaValidator {
    /**
     *
     * @param {{[resourceName: string]: import("../types/ResourceConfig").ResourceConfig}} resources
     */
    static validate(resources) {
        for(const [resourceName, resource] of Object.entries(resources)) {
            for(const [attribute, joiSchema] of Object.entries(resource.attributes)) {
                const helper = SchemaHelper.for(joiSchema)
                if (!helper.isRelationship) return

                for(const type of helper.relationTypes) {
                    if (!resources[type]) {
                        throw new Error(`'${resourceName}'.'${attribute}' is defined to hold a relation with '${type}', but '${type}' is not a valid resource name!`)
                    }
                }
                if (!helper.isBelongsToRelationship) return

                const backReference = resources[helper.relationTypes[0]].attributes[helper.inverseRelationshipName]
                if (!backReference) {
                    throw new Error(`'${resourceName}'.'${attribute}' is defined as being a foreign relation to the primary '${types[0]}'.'${foreignRelation}', but that primary relationship does not exist!`)
                }
            }
        }
    }
}

module.exports = schemaValidator