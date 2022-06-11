/**
 * @typedef {import("joi").Schema} Schema
 */

/**
 *
 */
class SchemaHelper {
    /**
     *
     * @param {Schema} schema
     * @returns
     */
    static for(schema) {
        if(!schema) {
            throw new Error("Internal error: no schema supplied")
        }

        return new SchemaHelper(schema)
    }

    /**
     *
     * @param {Schema | null} schema
     * @returns
     */
    static forOptional(schema) {
        if(schema) {
            return new SchemaHelper(schema)
        } else {
            return null
        }
    }

    /**
     * @type {Schema}
     */
    #schema

    /**
     *
     * @type {import("joi").Description & {flags: {[key: string]: any}}}
     */
    get #describe() {
        // @ts-ignore
        return this.#schema.describe()
    }

    /**
     *
     * @param {Schema} schema
     */
    constructor(schema) {
        this.#schema = schema
    }

    /**
     *
     */
    get allowedValues() {
        return this.#describe.allow || []
    }

    /**
     * @type {Schema | undefined}
     */
    get arrayItemType() {
        return this.#schema.$_terms?.items?.[0]
    }

    /**
     *
     * @returns
     */
    get debugString() {
        return JSON.stringify(this.#describe)
    }

    /**
     *
     */
    get description() {
        return this.#describe.description
    }

    /**
     * The name by which an inverse relationship is known (if this is one).
     */
    get inverseRelationshipName() {
        return this.#describe?.flags?.as
    }

    /**
     *
     */
    get isBelongsToRelationship() {
        return ["belongsToMany", "belongsToOne"].includes(this.type ?? "")
    }

    /**
     *
     */
    get isReadOnly() {
        return this.#describe.meta?.includes("readonly")
    }

    /**
     *
     */
    get isRelationship() {
        return ["one", "many", "belongsToOne", "belongsToMany"].includes(this.type ?? "")
    }

    /**
     *
     */
    get isRequired() {
        return this.#describe.flags?.presence === "required"
    }

    /**
     *
     */
    get isToManyRelationship() {
        return ["many", "belongsToMany"].includes(this.type ?? "")
    }

    /**
     *
     */
    get isToOneRelationship() {
        return ["one", "belongsToOne"].includes(this.type ?? "")
    }

    /**
     * All relation types, if and only if there's more than one
     */
    get multipleRelationTypes() {
        const types = this.relationTypes
        return (types && types.length > 1) ? types : undefined
    }

    /**
     *
     */
    get objectKeys() {
        return Object.keys(this.#describe.keys)
    }

    /**
     *
     */
    get relationTypeCodes() {
        if(this.isToOneRelationship) {
            /**
             * @type {string[]}
             */
            const types = []
            for(const m of this.#describe.matches.filter(m => m.schema.type == "apiEntity")) {
                types.push(...m.schema.keys.type.allow)
            }
            return types
        } else if(this.isToManyRelationship) {
            /**
             * @type {string[]}
             */
            const types = []
            for(const m of this.#describe.items.filter(m => m.type == "apiEntity")) {
                types.push(...m.keys.type.allow)
            }
            return types
        } else {
            return undefined
        }
    }

    /**
     * @type {string[]}
     */
    get relationTypes() {
        const describe = this.#describe
        return (describe?.flags?.one || describe?.flags?.many)
    }

    /**
     * A single relation type, if and only if there is exactly one.
     */
    get singleRelationType() {
        const types = this.relationTypes
        return (types && types.length == 1) ? types[0] : undefined
    }

    /**
     *
     */
    get type() {
        return this.#describe.type
    }

    /**
     *
     * @param {string} name
     */
    actionFor(name) {
        return this.#describe.flags?.action?.[name]
    }
}

module.exports = SchemaHelper