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
        return joiSchema.describe().flags?.action?.[name]
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static allowedValues(joiSchema) {
        return joiSchema.describe().allow || []
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns {Schema | undefined}
     */
    static arrayItemType(joiSchema) {
        return joiSchema.$_terms?.items?.[0]
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static debugString(joiSchema) {
        return JSON.stringify(joiSchema.describe())
    }

    /**
     *
     * @param {Schema} joiSchema
     */
    static description(joiSchema) {
        return joiSchema.describe().description
    }

    /**
     * Returns the name by which an inverse relationship is known (if this is one).
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static inverseRelationshipName(joiSchema) {
        return joiSchema.describe()?.flags?.as
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isBelongsToRelationship(joiSchema) {
        return ["belongsToMany", "belongsToOne"].includes(this.type(joiSchema))
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isReadOnly(joiSchema) {
        return joiSchema.describe().meta?.includes("readonly")
    }

    /**
     *
     * @param {Schema | null} joiSchema
     * @returns
     */
    static isRelationship(joiSchema) {
        if(!joiSchema) return false
        return ["one", "many", "belongsToOne", "belongsToMany"].includes(this.type(joiSchema))
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isRequired(joiSchema) {
        return joiSchema.describe().flags?.presence === "required"
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isToManyRelationship(joiSchema) {
        return ["many", "belongsToMany"].includes(this.type(joiSchema))
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static isToOneRelationship(joiSchema) {
        return ["one", "belongsToOne"].includes(this.type(joiSchema))
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns {string[] | undefined}
     */
    static objectKeys(joiSchema) {
        const describe = joiSchema.describe()
        return Object.keys(describe.keys)
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns {string[] | undefined}
     */
    static relationTypeCodes(joiSchema) {
        const describe = joiSchema.describe()
        if(SchemaHelper.isToOneRelationship(joiSchema)) {
            return describe.matches.find(m => m.schema.type == "apiEntity").schema.keys.type.allow
        } else if(SchemaHelper.isToManyRelationship(joiSchema)) {
            return describe.items.find(m => m.type == "apiEntity").keys.type.allow
        } else {
            return undefined
        }
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns {string[] | undefined}
     */
    static relationTypes(joiSchema) {
        const describe = joiSchema.describe()
        return (describe?.flags?.one || describe?.flags?.many)
    }

    /**
     *
     * @param {Schema} joiSchema
     */
    static type(joiSchema) {
        return joiSchema.describe().type
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