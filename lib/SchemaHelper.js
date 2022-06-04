/**
 * @typedef {import("joi").Schema} Schema
 */

/**
 *
 */
class SchemaHelper {
    /**
     *
     * @param {Schema} joiSchema
     * @param {string} name
     */
    static actionFor(joiSchema, name) {
        return joiSchema._settings?._action?.[name]
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isBelongsToRelationship(joiSchema) {
        return !!joiSchema._settings?.__as
    }

    /**
     *
     * @param {Schema | null} joiSchema
     * @returns
     */
    static isRelationship(joiSchema) {
        return !!joiSchema._settings
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isRequired(joiSchema) {
        return joiSchema._flags?.presence === "required"
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isToManyRelationship(joiSchema) {
        return !!joiSchema._settings?.__many
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isToOneRelationship(joiSchema) {
        return !!joiSchema._settings?.__one
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns {string[] | undefined}
     */
    static relationTypes(joiSchema) {
        return joiSchema._settings && (joiSchema._settings.__one || joiSchema._settings.__many)
    }

    /**
     *
     * @param {Schema} joiSchema
     */
    static type(joiSchema) {
        return joiSchema._type
    }

    /**
     * Returns all relation types if and only if there's more than one
     *
     * @param {Schema} joiSchema
     * @returns {string[] | undefined}
     */
    static multipleRelationTypes(joiSchema) {
        const types = this.relationTypes(joiSchema)
        return (types && types.length > 1) ? types : undefined
    }

    /**
     * Returns a single relation type if and only if there is exactly one.
     *
     * @param {Schema} joiSchema
     * @returns {string | undefined}
     */
    static singleRelationType(joiSchema) {
        const types = this.relationTypes(joiSchema)
        return (types && types.length == 1) ? types[0] : undefined
    }
}

module.exports = SchemaHelper