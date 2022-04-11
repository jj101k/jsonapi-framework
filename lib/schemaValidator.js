'use strict'
/**
 *
 */
class schemaValidator {
    /**
     *
     * @param {{[resourceName: string]: {attributes: {[attribute: string]: import("joi").Schema}}}} resources
     */
    static validate(resources) {
        for(const [resourceName, resource] of Object.entries(resources)) {
            for(const [attribute, joiSchema] of Object.entries(resource.attributes)) {
                if (!joiSchema._settings) return

                const types = joiSchema._settings.__one || joiSchema._settings.__many
                for(const type of types) {
                    if (!resources[type]) {
                        throw new Error(`'${resourceName}'.'${attribute}' is defined to hold a relation with '${type}', but '${type}' is not a valid resource name!`)
                    }
                }
                const foreignRelation = joiSchema._settings.__as
                if (!foreignRelation) return

                const backReference = resources[types[0]].attributes[foreignRelation]
                if (!backReference) {
                    throw new Error(`'${resourceName}'.'${attribute}' is defined as being a foreign relation to the primary '${types[0]}'.'${foreignRelation}', but that primary relationship does not exist!`)
                }
            }
        }
    }
}

module.exports = schemaValidator