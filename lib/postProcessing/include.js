"use strict"

const rerouter = require("../rerouter")
const debug = require("../debugging")
const utilities = require("../utilities")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")

/**
 * @typedef {{[key: string]: filter | filter[] | string | string[]}} filter
 */

/**
 *
 */
class includeClass extends RetainsJsonApiPrivate {
    /**
     *
     * @param {string} type
     * @param {string} k
     * @param {Set<string>} ids
     * @param {import('../../types/postProcessing').includeTree} includeTree
     * @returns
     */
    #buildURL(type, k, ids, includeTree) {
        const params = new URLSearchParams([
            ...[...ids.values()].map(id => [k, id]),
            ...Object.entries(includeTree.filter || {}),
        ].map(([k, v]) => [`filter[${k}]`, v]))

        return `${this.jsonApi._apiConfig.base + type}/?${params}`
    }

    /**
     *
     * @param {string} path
     * @param {import('../../types/postProcessing').includeTree} node
     * @param {filter | null} filter
     * @param {any[]} validationErrors
     * @returns
     */
    #iterate(path, node, filter, validationErrors) {
        if (path.length === 0) return null
        const [first, ...rest] = path.split(".")
        if (!filter) filter = {}

        const resourceAttribute = node.resourceConfig.map(
            resourceConfig => resourceConfig.attributes[first]
        ).filter(a => a).pop()
        if (!resourceAttribute) {
            return validationErrors.push({
                status: "403",
                code: "EFORBIDDEN",
                title: "Invalid inclusion",
                detail: `${node.resourceConfig.resource} do not have property ${first}`
            })
        }
        const relationInfo = resourceAttribute._settings.__one || resourceAttribute._settings.__many
        if (!relationInfo) {
            return validationErrors.push({
                status: "403",
                code: "EFORBIDDEN",
                title: "Invalid inclusion",
                detail: `${node.resourceConfig.resource}.${first} is not a relation and cannot be included`
            })
        }

        /**
         * @type {filter}
         */
        let restFilter
        if (Array.isArray(filter[first])) {
            restFilter = filter[first].filter(i => i instanceof Object).pop()
        } else {
            restFilter = filter[first] || { }
        }

        if (!node.sub[first]) {
            node.sub[first] = {
                dataItems: [],
                resourceConfig: relationInfo.map(a => this.jsonApi._resources[a]),
                filter: {},
                sub: {},
            }

            for (const i in restFilter) {
                if (Array.isArray(restFilter[i]) || typeof restFilter[i] === "string") {
                    node.sub[first].filter[i] = restFilter[i]
                }
            }
        }
        this.#iterate(rest.join("."), node.sub[first], restFilter)
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {string[]} includes
     * @param {filter | null} filters
     * @returns {import('../../types/postProcessing').includeTree}
     */
    async #arrayToTree(request, includes, filters) {
        const validationErrors = []
        /**
         * @type {import('../../types/postProcessing').includeTree}
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
            if (!includes || !includes.length) return
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
     * @param {import("../../types/postProcessing").includeTree} includeTree
     * @param {*} request
     */
    async #fillIncludeTree(includeTree, request) {
        const includes = Object.keys(includeTree.sub)

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
            for(const [relation, someRelation] of Object.entries(dataItem.relationships || { })) {
                if(relation.match(/^_/)) continue
                if(!includes.includes(relation)) continue

                if (someRelation.meta.relation === "primary") {
                    let relationItems = someRelation.data
                    if (!relationItems) continue
                    if (!(Array.isArray(relationItems))) relationItems = [relationItems]
                    for(const relationItem of relationItems) {
                        const key = `${relationItem.type}~~${relation}~~${relation}`
                        if(!primaryRelations.has(key)) {
                            primaryRelations.set(key, {
                                type: relationItem.type,
                                relation,
                                ids: new Set(),
                            })
                        }
                        primaryRelations.get(key).ids.add(relationItem.id)
                    }
                } else if (someRelation.meta.relation === "foreign") {
                    const key = `${someRelation.meta.as}~~${someRelation.meta.belongsTo}~~${relation}`
                    if(!foreignRelations.has(key)) {
                        foreignRelations.set(key, {
                            as: someRelation.meta.as,
                            belongsTo: someRelation.meta.belongsTo,
                            relation,
                            ids: new Set(),
                        })
                    }
                    foreignRelations.get(key).ids.add(dataItem.id)
                }
            }
        }

        const resourcesToFetch = [
            ...[...primaryRelations.entries()].map(
                ([relationKey, relation]) => ({
                    url: this.#buildURL(relation.type, "id", relation.ids, includeTree.sub[relation.relation]),
                    as: relationKey
                })
            ),
            ...[...foreignRelations.entries()].map(
                ([relationKey, relation]) => ({
                    url: this.#buildURL(relation.belongsTo, relation.as, relation.ids, includeTree.sub[relation.relation]),
                    as: relationKey
                })
            ),
        ]

        for(const related of resourcesToFetch) {
            const parts = related.as.split("~~")
            debug.include(related)

            let data
            try {
                const json = await new rerouter(this.jsonApi, this.privateData).route({
                    method: "GET",
                    uri: related.url,
                    originalRequest: request
                })
                data = json.data
            } catch(err) {
                debug.include("!!", JSON.stringify(err))
                throw err.errors
            }

            if (!data) continue
            if (!(Array.isArray(data))) data = [data]
            includeTree.sub[parts[2]].dataItems = includeTree.sub[parts[2]].dataItems.concat(data)
        }

        for(const include of includes) {
            if (include[0] === "_") continue
            await this.#fillIncludeTree(includeTree.sub[include], request)
        }
    }
}

module.exports = includeClass