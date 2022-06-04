"use strict"
const {Handler} = require("./Handler")
const JsonAPIError = require("../JsonAPIError")
const Sort = require("../postProcessing/Sort")

/**
 * @typedef {import("express").Request} Request
 */

/**
 * @typedef {import("../../types/postProcessing").Resource} Resource
 */

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

    handlesSort = true

    /**
     * @type {{[resource: string]: Resource[]}}
     */
    resources = {}

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
     * @param {Request} request
     * @param {(err, results?: Resource[], resultCount?: number) => any} callback
     * @returns
     */
    search(request, callback) {
        const entities = this.resources[request.params.type]
        /**
         * @type {Resource[]}
         */
        let results

        const idFilter = request.params?.filter?.id
        if (idFilter) {
            results = entities.filter(resource => idFilter.includes(resource.id))
        } else {
            results = entities
        }

        const [sorter] = Sort.sorter(request)
        results.sort(sorter)

        const resultCount = results.length

        const pagination = request.params.page

        const paginatedResults = pagination ?
            results.slice(pagination.offset, pagination.offset + pagination.limit) :
            results
        return callback(null, MemoryHandler.#clone(paginatedResults), resultCount)
    }

    /**
     * Delete a resource, given a resource type and id.
     *
     * @param {Request} request
     * @param {(err) => any} callback
     */
    delete(request, callback) {
        // Find the requested resource
        this.find(request, (err, theResource) => {
            if (err) return callback(err)

            // Remove the resource from the in-memory store.
            const entities = this.resources[request.params.type]
            const index = entities.findIndex(e => e.id == theResource.id)
            entities.splice(index, 1)

            // Return with no error
            return callback()
        })
    }

    /**
     * Update a resource, given a resource type and id, along with a partialResource.
     * partialResource contains a subset of changes that need to be merged over the original.
     *
     * @param {Request} request
     * @param {Partial<Resource>} partialResource
     * @param {(err, result: Resource) => any} callback
     */
    update(request, partialResource, callback) {
        // Find the requested resource
        this.find(request, (err, theResource) => {
            if (err) return callback(err)

            // Push the newly updated resource back into the in-memory store
            const entities = this.resources[request.params.type]
            const index = entities.findIndex(e => e.id == theResource.id)
            const updatedResource = entities[index] = {
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
     * @param {Request} request
     * @param {(err, result: Resource) => any} callback
     * @returns
     */
    find(request, callback) {
        const entities = this.resources[request.params.type]
        // Pull the requested resource from the in-memory store
        const theResource = entities.find(
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
     * @param {Request} request
     * @param {Resource} newResource
     * @param {(err, result: Resource) => any} callback
     * @returns
     */
    create(request, newResource, callback) {
        const entities = this.resources[request.params.type]
        // Check to see if the ID already exists
        const index = entities.findIndex(e => e.id == newResource.id)
        if (index === -1) {
            // Push the newResource into our in-memory store.
            entities.push(newResource)
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
