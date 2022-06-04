"use strict"

/**
 * @typedef {import("joi").Schema} Schema
 */

const SchemaHelper = require("./SchemaHelper")

/**
 *
 */
class schemaValidator {
    /**
     *
     * @param {{[resourceName: string]: import("../types/ResourceConfig")}} resources
     */
    static validate(resources) {
        for(const [resourceName, resource] of Object.entries(resources)) {
            for(const [attribute, joiSchema] of Object.entries(resource.attributes)) {
                if (!SchemaHelper.isRelationship(joiSchema)) return

                for(const type of SchemaHelper.relationTypes(joiSchema)) {
                    if (!resources[type]) {
                        throw new Error(`'${resourceName}'.'${attribute}' is defined to hold a relation with '${type}', but '${type}' is not a valid resource name!`)
                    }
                }
                if (!SchemaHelper.isBelongsToRelationship(joiSchema)) return
                const foreignRelation = SchemaHelper.inverseRelationshipName(joiSchema)

                const backReference = resources[types[0]].attributes[foreignRelation]
                if (!backReference) {
                    throw new Error(`'${resourceName}'.'${attribute}' is defined as being a foreign relation to the primary '${types[0]}'.'${foreignRelation}', but that primary relationship does not exist!`)
                }
            }
        }
    }
}

module.exports = schemaValidator