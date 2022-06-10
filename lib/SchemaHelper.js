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
     * @returns {import("joi").Description & {flags: {[key: string]: any}}}
     */
    static #describe(joiSchema) {
        // @ts-ignore
        return joiSchema.describe()
    }

    /**
     *
     * @param {Schema} joiSchema
     * @param {string} name
     */
    static actionFor(joiSchema, name) {
        return this.#describe(joiSchema).flags?.action?.[name]
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static allowedValues(joiSchema) {
        return this.#describe(joiSchema).allow || []
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
        return JSON.stringify(this.#describe(joiSchema))
    }

    /**
     *
     * @param {Schema} joiSchema
     */
    static description(joiSchema) {
        return this.#describe(joiSchema).description
    }

    /**
     * Returns the name by which an inverse relationship is known (if this is one).
     *
     * @param {Schema} joiSchema
     * @returns
     */
    static inverseRelationshipName(joiSchema) {
        return this.#describe(joiSchema)?.flags?.as
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
        return this.#describe(joiSchema).meta?.includes("readonly")
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
        return this.#describe(joiSchema).flags?.presence === "required"
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
        return Object.keys(this.#describe(joiSchema).keys)
    }

    /**
     *
     * @param {Schema} joiSchema
     * @returns {string[] | undefined}
     */
    static relationTypeCodes(joiSchema) {
        const describe = this.#describe(joiSchema)
        if(SchemaHelper.isToOneRelationship(joiSchema)) {
            /**
             * @type {string[]}
             */
            const types = []
            for(const m of describe.matches.filter(m => m.schema.type == "apiEntity")) {
                types.push(...m.schema.keys.type.allow)
            }
            return types
        } else if(SchemaHelper.isToManyRelationship(joiSchema)) {
            /**
             * @type {string[]}
             */
            const types = []
            for(const m of describe.items.filter(m => m.type == "apiEntity")) {
                types.push(...m.keys.type.allow)
            }
            return types
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
        const describe = this.#describe(joiSchema)
        return (describe?.flags?.one || describe?.flags?.many)
    }

    /**
     *
     * @param {Schema} joiSchema
     */
    static type(joiSchema) {
        return this.#describe(joiSchema).type
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