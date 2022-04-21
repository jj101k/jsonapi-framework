/**
 *
 */
class SchemaHelper {
    /**
     *
     * @param {import("joi").AnySchema} joiSchema
     * @returns {string[] | undefined}
     */
    static relationTypes(joiSchema) {
        return joiSchema._settings && (joiSchema._settings.__one || joiSchema._settings.__many)
    }

    /**
     * Returns all relation types if and only if there's more than one
     *
     * @param {import("joi").AnySchema} joiSchema
     * @returns {string | undefined}
     */
    static multipleRelationTypes(joiSchema) {
        const types = this.relationTypes(joiSchema)
        return (types && types.length > 1) ? types : undefined
    }

    /**
     * Returns a single relation type if and only if there is exactly one.
     *
     * @param {import("joi").AnySchema} joiSchema
     * @returns {string | undefined}
     */
    static singleRelationType(joiSchema) {
        const types = this.relationTypes(joiSchema)
        return (types && types.length == 1) ? types[0] : undefined
    }
}

module.exports = SchemaHelper