"use strict"

const pagination = require("./pagination")
const debug = require("./debugging")
const JsonAPIError = require("./JsonAPIError")
const SchemaHelper = require("./SchemaHelper")

/**
 * @typedef {import("../types/Handler").JsonApiRequest} JsonApiRequest
 * @typedef {{[key: string]: any}} metadata
 */

/**
 * @template T
 * @typedef {T | T[]} possibleArray<T>
 */

/**
 *
 */
class responseHelper {
    /**
     *
     * @template T
     * @param {possibleArray<T>} v
     * @returns
     */
    #ensureArray(v) {
        if(Array.isArray(v)) {
            return v
        } else {
            return [v]
        }
    }

    /**
     *
     * @param {*} item
     * @param {SchemaHelper} helper
     * @returns
     */
    #generateDataItem(item, helper) {
        /**
         * @type {{[property: string]: SchemaHelper}}
         */
        const linkProperties = {}
        /**
         * @type {string[]}
         */
        const attributeProperties = []
        for(const [someProperty, propertyHelper] of helper.objectEntries) {
            if(propertyHelper.isRelationship) {
                linkProperties[someProperty] = propertyHelper
            } else if(!["id", "type", "meta"].includes(someProperty)) {
                attributeProperties.push(someProperty) //
            }
        }

        return {
            type: item.type,
            id: item.id,
            attributes: Object.fromEntries(
                Object.entries(item).filter(([k, v]) => attributeProperties.includes(k))
            ),
            links: {
                self: `${this.baseUrl + item.type}/${item.id}`,
            },
            relationships: this.#generateRelationships(item, linkProperties),
            meta: item.meta
        }
    }

    /**
     *
     * @param {*} item
     * @param {SchemaHelper} helper
     * @param {string} linkProperty
     * @returns
     */
    #generateLink(item, helper, linkProperty) {
        /**
         * @type {undefined | null | {type: string, id: string, meta: any} | {type: string, id: string, meta: any}[]}
         */
        let data

        const relationshipLink = linkItem => ({type: linkItem.type, id: linkItem.id, meta: linkItem.meta})

        if(helper.isBelongsToRelationship && !item[linkProperty]) {
            // $FlowFixMe: the data property can be either undefined (not present), null or [ ]
            data = undefined
        } else if (helper.isToOneRelationship) {
            const linkItem = item[linkProperty]
            if(linkItem) {
                // $FlowFixMe: the data property can be either undefined (not present), null or [ ]
                data = relationshipLink(linkItem)
            } else {
                data = null
            }
        } else if (helper.isToManyRelationship) {
            // $FlowFixMe: the data property can be either undefined (not present), null or [ ]
            const linkItems = item[linkProperty]
            if (linkItems) {
                data = this.#ensureArray(linkItems).map(linkItem => relationshipLink(linkItem))
            } else {
                data = []
            }
        } else {
            data = null
        }

        let links
        let meta

        if (helper.isBelongsToRelationship) {
            const as = helper.inverseRelationshipName
            const relatedResource = helper.relationTypes[0]

            meta = {
                relation: "foreign",
                belongsTo: relatedResource,
                as,
                many: helper.isToManyRelationship,
                readOnly: true
            }

            links = {
                // get information about the linkage - list of ids and types
                // /rest/bookings/relationships/?customer=26aa8a92-2845-4e40-999f-1fa006ec8c63
                self: `${this.baseUrl + relatedResource}/relationships/?${as}=${item.id}`,
                // get full details of all linked resources
                // /rest/bookings/?filter[customer]=26aa8a92-2845-4e40-999f-1fa006ec8c63
                related: `${this.baseUrl + relatedResource}/?filter[${as}]=${item.id}`,
            }
        } else {
            meta = {
                relation: "primary",
                // type: helper.relationTypes,
                readOnly: false
            }

            links = {
                self: `${this.baseUrl + item.type}/${item.id}/relationships/${linkProperty}`,
                related: `${this.baseUrl + item.type}/${item.id}/${linkProperty}`
            }
        }

        return {meta, links, data}
    }

    /**
     *
     * @param {*} item
     * @param {{[property: string]: SchemaHelper}} linkProperties
     * @returns
     */
    #generateRelationships(item, linkProperties) {
        const entries = Object.entries(linkProperties)
        if (entries.length === 0) return undefined

        return Object.fromEntries(
            entries.map(([linkProperty, helper]) => [
                linkProperty,
                this.#generateLink(item, helper, linkProperty)
            ])
        )
    }

    /**
     * @type {string}
     */
    baseUrl

    /**
     * @type {metadata | ((request: JsonApiRequest) => metadata)}
     */
    metadata

    /**
     *
     * @param {possibleArray<any>} items
     * @param {import("joi").Schema} schema
     */
    async _enforceSchemaOnArray(items, schema) {
        // the validation process can take a lengthy amount of time when processing large responses.
        // to prevent other requests from being blocked by this syncronous process, we break it up using
        // setImmediate (see _enforceSchemaOnObject below), and force this map to run in series instead of in parallel.
        // It really will not make much of a difference to individual requests, but
        // splitting it up this way makes a HUGE difference if a small request arrives on the server while a large request's
        // output is still being validated.

        const promises = this.#ensureArray(items).map(
            (item) => this._enforceSchemaOnObject(item, schema)
        )
        return (await Promise.all(promises)).filter(result => !!result)
    }

    /**
     *
     * @param {*} item
     * @param {import("joi").Schema} schema
     */
    async _enforceSchemaOnObject(item, schema) {
        await new Promise(resolve => setImmediate(resolve))

        const itemIdentity = JSON.stringify(item)
        debug.validationOutput(itemIdentity)
        try {
            const helper = SchemaHelper.for(schema)
            const validationResult = await helper.validate(item)
            if(validationResult.error) {
                throw validationResult.error
            }
            return this.#generateDataItem(validationResult.value, helper)
        } catch(err) {
            debug.validationError(err.message, itemIdentity)
            throw new JsonAPIError(
                "500",
                "EINVALIDITEM",
                "Item in response does not validate",
                {
                    item,
                    error: err.message
                }
            )
        }
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {possibleArray<JsonAPIError | Error | undefined>} err
     * @returns
     */
    generateError(request, err) {
        debug.errors(request.route.verb, request.route.combined, JSON.stringify(err))

        return {
            jsonapi: {version: "1.0"},
            meta: this._generateMeta(request),
            links: {self: this.baseUrl + request.route.path},
            errors: this.#ensureArray(err).map(error => {
                if(error instanceof JsonAPIError) {
                    return error
                } else {
                    console.error(error)
                    return {
                        status: null,
                        code: null,
                        title: null,
                        detail: null,
                    }
                }
            }),
        }
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {{[key: string]: any}} data
     * @param {number} [handlerTotal]
     * @returns
     */
    _generateResponse(request, data, handlerTotal = undefined) {
        return {
            jsonapi: {
                version: "1.0"
            },
            meta: this._generateMeta(request, handlerTotal),
            links: {
                self: this.baseUrl + request.route.path + request.route.query?.replace(/^(.)/, "?$1"),
                ...pagination.generatePageLinks(request, handlerTotal),
            },
            data,
        }
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {number} [handlerTotal]
     * @returns
     */
    _generateMeta(request, handlerTotal = undefined) {
        /**
         * @type {metadata}
         */
        let meta
        if (typeof this.metadata === "function") {
            meta = this.metadata(request)
        } else {
            meta = {...this.metadata}
        }

        if (handlerTotal) {
            meta.page = pagination.generateMetaSummary(request, handlerTotal)
        }

        return meta
    }
}

module.exports = responseHelper