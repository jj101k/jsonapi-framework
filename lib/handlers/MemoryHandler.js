"use strict"
const {Handler} = require("./Handler")
const utilities = require("../utilities")
const JsonAPIError = require("../JsonAPIError")

/**
 *
 */
class MemoryHandler extends Handler {
    /**
     *
     * @param {*} obj
     * @returns
     */
    static #clone(obj) {
        return JSON.parse(JSON.stringify(obj))
    }

    /**
     *
     * @param {{id: string}[]} list
     * @param {{id: string}} obj
     * @returns
     */
    static #indexOf(list, obj) {
        for (const i in list) {
            if (list[i].id === obj.id) return i
        }
        return -1
    }

    /**
     *
     */
    resources = {}

    /**
     *
     */
    constructor() {
        super()
        this.handlesSort = true
    }

    /**
     * Internal helper function to sort data
     *
     * @param {import("express").Request} request
     * @param {{[key: string]: *}} list
     */
    #sortList(request, list) {
        const attributeSpec = utilities.stringIsh(request.params.sort)
        if (!attributeSpec) return

        let md
        if (typeof attributeSpec == "string" && (md = attributeSpec.match(/^-(.+)/))) {
            const attribute = md[1]
            list.sort((a, b) => {
                if (typeof a[attribute] === "string") {
                    return b[attribute].localeCompare(a[attribute])
                } else if (typeof a[attribute] === "number") {
                    return (b[attribute] - a[attribute])
                } else {
                    return 0
                }
            })
        } else {
            const attribute = "" + attributeSpec
            list.sort((a, b) => {
                if (typeof a[attribute] === "string") {
                    return a[attribute].localeCompare(b[attribute])
                } else if (typeof a[attribute] === "number") {
                    return (a[attribute] - b[attribute])
                } else {
                    return 0
                }
            })
        }
    }

    /**
     * initialise gets invoked once for each resource that uses this hander.
     * In this instance, we're allocating an array in our in-memory data store.
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     */
    initialise(resourceConfig) {
        this.resources[resourceConfig.resource] = resourceConfig.examples || []
        this.ready = true
    }

    /**
     * Search for a list of resources, given a resource type.
     *
     * @param {import("express").Request} request
     * @param {(err, results: any[], resultCount: number) => any} callback
     * @returns
     */
    search(request, callback) {
        /**
         * @type {{id: string, [key: string]: *}[]}
         */
        let results

        if (request.params?.filter?.id) {
            results = this.resources[request.params.type].filter(resource => request.params.filter.id.includes(resource.id))
        } else {
            results = this.resources[request.params.type]
        }

        this.#sortList(request, results)
        const resultCount = results.length

        const paginatedResults = request.params.page ?
            results.slice(request.params.page.offset, request.params.page.offset + request.params.page.limit) :
            results
        return callback(null, MemoryHandler.#clone(paginatedResults), resultCount)
    }

    /**
     * Delete a resource, given a resource type and id.
     *
     * @param {import("express").Request} request
     * @param {(err) => any} callback
     */
    delete(request, callback) {
        // Find the requested resource
        this.find(request, (err, theResource) => {
            if (err) return callback(err)

            // Remove the resource from the in-memory store.
            const index = MemoryHandler.#indexOf(this.resources[request.params.type], theResource)
            this.resources[request.params.type].splice(index, 1)

            // Return with no error
            return callback()
        })
    }

    /**
     * Update a resource, given a resource type and id, along with a partialResource.
     * partialResource contains a subset of changes that need to be merged over the original.
     *
     * @param {import("express").Request} request
     * @param {{[key: string]: *}} partialResource
     * @param {(err, result) => any} callback
     */
    update(request, partialResource, callback) {
        // Find the requested resource
        this.find(request, (err, theResource) => {
            if (err) return callback(err)

            // Push the newly updated resource back into the in-memory store
            const index = MemoryHandler.#indexOf(this.resources[request.params.type], theResource)
            const updatedResource = this.resources[request.params.type][index] = {
                ...theResource,
                ...partialResource
            }

            // Return the newly updated resource
            return callback(null, MemoryHandler.#clone(updatedResource))
        })
    }

    /**
     * Find a specific resource, given a resource type and and id.
     *
     * @param {import("express").Request} request
     * @param {(err, result) => any} callback
     * @returns
     */
    find(request, callback) {
        // Pull the requested resource from the in-memory store
        const theResource = this.resources[request.params.type].find(
            anyResource => anyResource.id === request.params.id
        )

        if (theResource) {
            // Return the requested resource
            return callback(null, MemoryHandler.#clone(theResource))
        } else {
            // If the resource doesn't exist, error
            return callback(new JsonAPIError(
                "404",
                "ENOTFOUND",
                "Requested resource does not exist",
                `There is no ${request.params.type} with id ${request.params.id}`,
            ))
        }
    }

    /**
     * Create (store) a new resource given a resource type and an object.
     *
     * @param {import("express").Request} request
     * @param {{[key: string]: *}} newResource
     * @param {(err, result) => any} callback
     * @returns
     */
    create(request, newResource, callback) {
        // Check to see if the ID already exists
        const index = MemoryHandler.#indexOf(this.resources[request.params.type], newResource)
        if (index === -1) {
            // Push the newResource into our in-memory store.
            this.resources[request.params.type].push(newResource)
            // Return the newly created resource
            return callback(null, MemoryHandler.#clone(newResource))
        } else {
            return callback(new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Requested resource already exists",
                `The requested resource already exists of type ${request.params.type} with id ${request.params.id}`
            ))
        }
    }
}

module.exports = MemoryHandler
