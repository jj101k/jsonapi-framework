"use strict"

const debug = require("./debugging")
const rerouter = require("./rerouter")
const Fields = require("./postProcessing/Fields")
const Filter = require("./postProcessing/Filter")
const Include = require("./postProcessing/Include")
const Sort = require("./postProcessing/Sort")
const RetainsJsonApiPrivate = require("./RetainsJsonApiPrivate")
const SchemaHelper = require("./SchemaHelper")

// sometimes the resourceConfig is an object... sometimes it's an array.
function getHandlerFromRequest(request) {
    let rc = request.resourceConfig || {}
    if (rc instanceof Array) {
        rc = rc[0] || {}
    }
    return rc.handlers || {}
}

/**
 * @typedef {import("../types/Handler").JsonApiRequest} JsonApiRequest
 * @typedef {import("../types/postProcessing").postProcessingHandler} postProcessingHandler
 */

/**
 *
 */
class postProcessClass extends RetainsJsonApiPrivate {
    /**
     * @type {postProcessingHandler["action"]}
     */
    #applyFields

    /**
     * @type {postProcessingHandler["action"]}
     */
    #applyFilter

    /**
     * @type {postProcessingHandler["action"]}
     */
    #applyIncludes

    /**
     * @type {postProcessingHandler["action"]}
     */
    #applySort

    /**
     *
     * @param {import("./jsonApi")} jsonApi
     * @param {import("./jsonApiPrivate")} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)

        this.#applyFields = new Fields(this.jsonApi).action
        this.#applyFilter = new Filter().action
        this.#applyIncludes = new Include(this.jsonApi, this.privateData).action
        this.#applySort = new Sort().action
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {import("express").Response} response
     * @param {(error?: any) => any} callback
     */
    async handle(request, response, callback) {
        const handler = getHandlerFromRequest(request)

        try {
            // short circuit if a custom handler claims to already have done the postprocess step
            // (e.g. if a handler is generating a database query that is already returning the records in the correct order,
            // it can set handlesSort = true on itself)
            if(!handler.handlesSort) {
                // declare that we are entering a postprocess step.
                // this will allow custom handlers to optionally provide alternative logic pathes when doing postprocess
                // steps like fetching foreign key records for 'includes', etc. (i.e. it will allow the custom handler to
                // differentiate a GET /:type request and a rerouted include request GET /:type?include=other_type
                request.postProcess = "sort"
                await this.#applySort(request, response)
            }
            if(!handler.handlesFilter) {
                request.postProcess = "filter"
                await this.#applyFilter(request, response)
            }

            // not permitting handlers to skip includes or fields, since these two steps cross the bounds into
            // other handlers' data.
            request.postProcess = "includes"
            await this.#applyIncludes(request, response)
            request.postProcess = "fields"
            await this.#applyFields(request, response)

            callback()
        } catch(err) {
            console.warn(err)
            callback(err)
        }
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {any} mainResource
     * @returns {Promise<[any[], number | null]>}
     */
    async _fetchRelatedResources(request, mainResource) {
        // Fetch the other objects
        const relation = mainResource[request.params.relation]

        if (!relation) return [[null], null]

        const dataItems = Array.isArray(relation) ? relation : [relation]

        const resourcesToFetch = {}
        for(const dataItem of dataItems) {
            if(!resourcesToFetch[dataItem.type]) {
                resourcesToFetch[dataItem.type] = []
            }
            resourcesToFetch[dataItem.type].push(dataItem.id)
        }

        const urlJoiner = "&filter[id]="
        const resourceURLs = Object.entries(resourcesToFetch).map(([type, ids]) => {
            const uriInitial = `${this.jsonApi._apiConfig.pathPrefix + type}/?${ids.map(id => urlJoiner + id).join("")}`
            if (request.route.query) {
                return uriInitial + `&${request.route.query}`
            } else {
                return uriInitial
            }
        })

        let total = null
        const relatedResources = []
        for(const related of resourceURLs) {
            debug.include(related)

            let json
            try {
                json = await new rerouter(this.jsonApi, this.privateData).route({
                    method: "GET",
                    uri: related,
                    originalRequest: request,
                    params: {filter: request.params.filter}
                })
            } catch(err) {
                debug.include("!!", JSON.stringify(err))
                throw err.errors
            }

            let data = json.data

            if (json.meta && json.meta.page) {
                total = total || 0
                total += json.meta.page.total
            }

            if (!Array.isArray(data)) data = [data]

            relatedResources.push(...data)
        }
        return [relatedResources, total]
    }

    /**
     *
     * @param {any[]} items
     * @param {import("../types/ResourceConfig").ResourceConfig["attributes"]} attributes
     * @returns
     */
    fetchForeignKeys(items, attributes) {
        if (!Array.isArray(items)) {
            items = [items]
        }
        for(const item of items) {
            for (const [attr, schema] of Object.entries(attributes)) {
                if (SchemaHelper.for(schema).isBelongsToRelationship) {
                    delete item[attr]
                }
            }
        }
    }
}

module.exports = postProcessClass