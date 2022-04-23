"use strict"

const rerouter = require("../rerouter")
const debug = require("../debugging")
const utilities = require("../utilities")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const JsonAPIError = require("../JsonAPIError")

/**
 * @typedef {import("../../types/postProcessing").postProcessingRequest} postProcessingRequest
 */

/**
 * @typedef {import('../../types/postProcessing').includeTree} includeTree
 */

/**
 * @typedef {import("../../types/postProcessing").Resource} Resource
 */

/**
 * @typedef {{[key: string]: filter | filter[] | string | string[]}} filter
 */

/**
 *
 */
class Include extends RetainsJsonApiPrivate {
    /**
     *
     * @param {string} type
     * @param {string} idField
     * @param {Set<string>} ids
     * @param {includeTree} includeTree
     * @returns
     */
    #buildURL(type, idField, ids, includeTree) {
        const params = new URLSearchParams([
            ...[...ids.values()].map(id => [idField, id]),
            ...Object.entries(includeTree.filter || {}),
        ].map(([idField, id]) => [`filter[${idField}]`, id]))

        return `${this.jsonApi._apiConfig.base + type}/?${params}`
    }

    /**
     *
     * @param {string} path
     * @param {includeTree} node
     * @param {filter | null} filter
     * @param {JsonAPIError[]} validationErrors
     * @returns
     */
    #iterate(path, node, filter, validationErrors) {
        if (path.length === 0) return null
        const [first, ...rest] = path.split(".")

        const resourceAttribute = node.resourceConfig.map(
            resourceConfig => resourceConfig.attributes[first]
        ).filter(a => a).pop()
        if (!resourceAttribute) {
            return validationErrors.push(new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid inclusion",
                `${node.resourceConfig.resource} do not have property ${first}`
            ))
        }
        const relationInfo = resourceAttribute._settings.__one || resourceAttribute._settings.__many
        if (!relationInfo) {
            return validationErrors.push(new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid inclusion",
                `${node.resourceConfig.resource}.${first} is not a relation and cannot be included`
            ))
        }

        /**
         * @type {filter}
         */
        let restFilter
        if (Array.isArray(filter?.[first])) {
            restFilter = filter[first].reduce((c, i) => i instanceof Object ? i : c, null)
        } else {
            restFilter = filter?.[first] || { }
        }

        if (!node.sub[first]) {
            node.sub[first] = {
                dataItems: [],
                resourceConfig: relationInfo.map(a => this.jsonApi._resources[a]),
                filter: Object.fromEntries(
                    Object.entries(restFilter || {}).filter(
                        ([i, filter]) => Array.isArray(filter) || typeof filter === "string"
                    )
                ),
                sub: {},
            }
        }
        this.#iterate(rest.join("."), node.sub[first], restFilter)
    }

    /**
     *
     * @param {postProcessingRequest} request
     * @param {string[]} includes
     * @param {filter | null} filters
     * @returns {includeTree}
     */
    async #arrayToTree(request, includes, filters) {
        const validationErrors = []
        /**
         * @type {includeTree}
         */
        const tree = {
            dataItems: null,
            resourceConfig: Array.isArray(request.resourceConfig) ?
                [...request.resourceConfig] :
                [request.resourceConfig],
            sub: {},
        }

        for(const include of includes) {
            this.#iterate(include, tree, filters, validationErrors)
        }

        if (validationErrors.length > 0) throw validationErrors
        return tree
    }

    /**
     * @type {import("../../types/postProcessing").postProcessingHandler["action"]}
     */
    get action() {
        return async (request, response) => {
            const includes = utilities.commaSeparatedArray(request.params.include)
            if (!includes?.length) return
            const filters = request.params.filter

            const includeTree = await this.#arrayToTree(request, includes, filters)

            includeTree.dataItems = Array.isArray(response.data) ?
                response.data :
                [response.data]

            await this.#fillIncludeTree(includeTree, request)

            response.included = Object.values(Object.fromEntries(
                this.#getDataItemsFromTree({
                    ...includeTree,
                    dataItems: [],
                }).map(someItem => [`${someItem.type}~~${someItem.id}`, someItem])
            ))
        }
    }

    /**
     *
     * @param {import("../../types/postProcessing").dataTree} tree
     * @returns
     */
    #getDataItemsFromTree(tree) {
        const items = [...tree.dataItems]
        for (const v of Object.values(tree.sub)) {
            items.push(...this.#getDataItemsFromTree(v))
        }
        return items
    }

    /**
     *
     * @param {includeTree} includeTree
     * @param {postProcessingRequest} request
     */
    async #fillIncludeTree(includeTree, request) {
        const includes = Object.keys(includeTree.sub).filter(name => !name.match(/^_/))

        /**
         * @type {Map<string, {as: string, belongsTo: string, relation: string, ids: Set<string>}>}
         */
        const foreignRelations = new Map()
        /**
         * @type {Map<string, {type: string, relation: string, ids: Set<string>}>}
         */
        const primaryRelations = new Map()
        for(const dataItem of includeTree.dataItems) {
            if (!dataItem) continue
            const relationshipEntries = Object.entries(dataItem.relationships || { }).filter(([name]) => !name.match(/^_/))
            for(const [relationName, relationInfo] of relationshipEntries) {
                if(!includes.includes(relationName)) continue

                if (relationInfo.meta.relation === "primary") {
                    if (!relationInfo.data) continue
                    const relationItems = Array.isArray(relationInfo.data) ? relationInfo.data : [relationInfo.data]
                    for(const relationItem of relationItems) {
                        const key = [relationItem.type, relationName].join("~~")
                        if(!primaryRelations.has(key)) {
                            primaryRelations.set(key, {
                                type: relationItem.type,
                                relation: relationName,
                                ids: new Set(),
                            })
                        }
                        primaryRelations.get(key).ids.add(relationItem.id)
                    }
                } else if (relationInfo.meta.relation === "foreign") {
                    const key = [relationInfo.meta.as, relationInfo.meta.belongsTo, relationName].join("~~")
                    if(!foreignRelations.has(key)) {
                        foreignRelations.set(key, {
                            as: relationInfo.meta.as,
                            belongsTo: relationInfo.meta.belongsTo,
                            relation: relationName,
                            ids: new Set(),
                        })
                    }
                    foreignRelations.get(key).ids.add(dataItem.id)
                }
            }
        }

        const resourcesToFetch = [
            ...[...primaryRelations.values()].map((relation) => [
                relation.relation,
                this.#buildURL(relation.type, "id", relation.ids, includeTree.sub[relation.relation]),
            ]),
            ...[...foreignRelations.values()].map((relation) => [
                relation.relation,
                this.#buildURL(relation.belongsTo, relation.as, relation.ids, includeTree.sub[relation.relation]),
            ]),
        ]

        for(const [name, uri] of resourcesToFetch) {
            debug.include([name, uri])

            /**
             * @type {Resource | Resource[] | undefined}
             */
            let data
            try {
                const json = await new rerouter(this.jsonApi, this.privateData).route({
                    method: "GET",
                    uri,
                    originalRequest: request
                })
                data = json.data
            } catch(err) {
                debug.include("!!", JSON.stringify(err))
                throw err.errors
            }

            if (!data) continue
            if(Array.isArray(data)) {
                includeTree.sub[name].dataItems.push(...data)
            } else {
                includeTree.sub[name].dataItems.push(data)
            }
        }

        for(const name of includes) {
            await this.#fillIncludeTree(includeTree.sub[name], request)
        }
    }
}

module.exports = Include