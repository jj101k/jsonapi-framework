"use strict"

const pagination = require("./pagination")
const Joi = require("joi")
const debug = require("./debugging")
const JsonAPIError = require("./JsonAPIError")

/**
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
     * @type {string}
     */
    #baseUrl

    /**
     * @type {metadata | (request: Express.Request) => metadata}
     */
    #metadata

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
     * @param {string} baseUrl
     */
    setBaseUrl(baseUrl) {
        this.#baseUrl = baseUrl
    }

    /**
     *
     * @param {metadata | (request: Express.Request) => metadata} meta
     */
    setMetadata(meta) {
        this.#metadata = meta
    }

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
        const results = []
        for(const item of this.#ensureArray(items)) {
            results.push(await this._enforceSchemaOnObject(item, schema))
        }
        return results.filter(result => !!result)
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
            const sanitisedItem = await Joi.validate(item, schema)
            return this.#generateDataItem(sanitisedItem, schema)
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
     * @param {*} item
     * @param {import("joi").Schema} schema
     * @returns
     */
    #generateDataItem(item, schema) {
        /**
         * @type {string[]}
         */
        const linkProperties = []
        /**
         * @type {string[]}
         */
        const attributeProperties = []
        for(const [someProperty, subSchema] of Object.entries(schema)) {
            if(subSchema instanceof Object && subSchema._settings) {
                linkProperties.push(someProperty)
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
                self: `${this.#baseUrl + item.type}/${item.id}`,
            },
            relationships: this.#generateRelationships(item, schema, linkProperties),
            meta: item.meta
        }
    }

    /**
     *
     * @param {*} item
     * @param {import("joi").Schema} schema
     * @param {string[]} linkProperties
     * @returns
     */
    #generateRelationships(item, schema, linkProperties) {
        if (linkProperties.length === 0) return undefined

        return Object.fromEntries(
            linkProperties.map(linkProperty => [
                linkProperty,
                this.#generateLink(item, schema[linkProperty], linkProperty)
            ])
        )
    }

    /**
     *
     * @param {*} item
     * @param {import("joi").Schema} schemaProperty
     * @param {string} linkProperty
     * @returns
     */
    #generateLink(item, schemaProperty, linkProperty) {
        /**
         * @type {undefined | null | {type: string, id: string, meta: any} | {type: string, id: string, meta: any}[]}
         */
        let data

        if(schemaProperty._settings.__as && !item[linkProperty]) {
            // $FlowFixMe: the data property can be either undefined (not present), null or [ ]
            data = undefined
        } else if (schemaProperty._settings.__one) {
            const linkItem = item[linkProperty]
            if(linkItem) {
                // $FlowFixMe: the data property can be either undefined (not present), null or [ ]
                data = {
                    type: linkItem.type,
                    id: linkItem.id,
                    meta: linkItem.meta
                }
            } else {
                data = null
            }
        } else if (schemaProperty._settings.__many) {
            // $FlowFixMe: the data property can be either undefined (not present), null or [ ]
            const linkItems = item[linkProperty]
            if (linkItems) {
                data = this.#ensureArray(linkItems).map(linkItem => ({
                    type: linkItem.type,
                    id: linkItem.id,
                    meta: linkItem.meta
                }))
            } else {
                data = []
            }
        } else {
            data = null
        }

        let links
        let meta

        if (schemaProperty._settings.__as) {
            const relatedResource = (schemaProperty._settings.__one || schemaProperty._settings.__many)[0]

            meta = {
                relation: "foreign",
                belongsTo: relatedResource,
                as: schemaProperty._settings.__as,
                many: !!schemaProperty._settings.__many,
                readOnly: true
            }

            links = {
                // get information about the linkage - list of ids and types
                // /rest/bookings/relationships/?customer=26aa8a92-2845-4e40-999f-1fa006ec8c63
                self: `${this.#baseUrl + relatedResource}/relationships/?${schemaProperty._settings.__as}=${item.id}`,
                // get full details of all linked resources
                // /rest/bookings/?filter[customer]=26aa8a92-2845-4e40-999f-1fa006ec8c63
                related: `${this.#baseUrl + relatedResource}/?filter[${schemaProperty._settings.__as}]=${item.id}`,
            }
        } else {
            meta = {
                relation: "primary",
                // type: schemaProperty._settings.__many || schemaProperty._settings.__one,
                readOnly: false
            }

            links = {
                self: `${this.#baseUrl + item.type}/${item.id}/relationships/${linkProperty}`,
                related: `${this.#baseUrl + item.type}/${item.id}/${linkProperty}`
            }
        }

        return {
            meta,
            links,
            data,
        }
    }

    /**
     *
     * @param {Express.Request} request
     * @param {possibleArray<JsonAPIError | Error | undefined>} err
     * @returns
     */
    generateError(request, err) {
        debug.errors(request.route.verb, request.route.combined, JSON.stringify(err))

        return {
            jsonapi: {
                version: "1.0"
            },
            meta: this._generateMeta(request),
            links: {
                self: this.#baseUrl + request.route.path,
            },
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
     * @param {Express.Request} request
     * @param {import("../types/jsonApi").ResourceConfig} resourceConfig
     * @param {{[key: string]: any}} sanitisedData
     * @param {number} handlerTotal
     * @returns
     */
    _generateResponse(request, resourceConfig, sanitisedData, handlerTotal) {
        return {
            jsonapi: {
                version: "1.0"
            },
            meta: this._generateMeta(request, handlerTotal),
            links: {
                self: this.#baseUrl + request.route.path + request.route.query?.replace(/^(.)/, "?$1"),
                ...pagination.generatePageLinks(request, handlerTotal),
            },
            data: sanitisedData,
        }
    }

    /**
     *
     * @param {Express.Request} request
     * @param {number} handlerTotal
     * @returns
     */
    _generateMeta(request, handlerTotal) {
        /**
         * @type {metadata}
         */
        let meta
        if (typeof this.#metadata === "function") {
            meta = this.#metadata(request)
        } else {
            meta = {...this.#metadata}
        }

        if (handlerTotal) {
            meta.page = pagination.generateMetaSummary(request, handlerTotal)
        }

        return meta
    }
}

module.exports = responseHelper