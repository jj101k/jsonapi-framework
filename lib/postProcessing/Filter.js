"use strict"
const debug = require("../debugging")
const JsonAPIError = require("../JsonAPIError")

/**
 * @typedef {import("../../types/postProcessing").Resource} Resource
 */

/**
 * @typedef {">" | "<" | "~" | ":"} operatorType
 */

/**
 * @typedef {{operator?: operatorType, value: any}} filterType
 */

/**
 *
 */
class Filter {
    /**
     * @type {{[operator: string]: (attrValue: string | number | any,
     * filterValue: string) => boolean}}
     */
    get #filterFunction() {
        return {
            ">": (attrValue, filterValue) => attrValue > filterValue,
            "<": (attrValue, filterValue) => attrValue < filterValue,
            "~": (attrValue, filterValue) => attrValue.toLowerCase() === filterValue.toLowerCase(),
            ":": (attrValue, filterValue) => attrValue.toLowerCase().indexOf(filterValue.toLowerCase()) !== -1,
        }
    }

    /**
     *
     * @param {string | number | any} attributeValue
     * @param {filterType[]} whitelist
     * @returns
     */
    #attributesMatchesOR(attributeValue, whitelist) {
        return whitelist.some(
            filterElement => this.#filterMatches(filterElement, attributeValue)
        )
    }

    /**
     *
     * @param {import("../../types/postProcessing").FullResource} someObject
     * @param {{[property: string]: filterType[]}} filters
     * @returns
     */
    #filterKeepObject(someObject, filters) {
        for (const filterName in filters) {
            const whitelist = filters[filterName]

            if (filterName === "id") {
                if(!this.#attributesMatchesOR(someObject.id, whitelist)) {
                    return false
                }
            } else if (filterName in someObject.attributes) {
                if(!this.#attributesMatchesOR(someObject.attributes[filterName], whitelist)) {
                    return false
                }
            } else if (filterName in someObject.relationships) {
                if(!this.#relationshipMatchesOR(someObject.relationships[filterName], whitelist)) {
                    return false
                }
            } else {
                return false
            }
        }
        return true
    }

    /**
     *
     * @param {filterType} filterElement
     * @param {string | number | any} attributeValue
     * @returns
     */
    #filterMatches(filterElement, attributeValue) {
        if (!filterElement.operator) {
            return JSON.stringify(attributeValue) == JSON.stringify(filterElement.value)
        }
        return this.#filterFunction[filterElement.operator](attributeValue, filterElement.value)
    }

    /**
     *
     * @param {{data?: Resource | Resource[] | null}} relationship
     * @param {filterType[]} whitelist
     * @returns
     */
    #relationshipMatchesOR(relationship, whitelist) {
        if (!relationship.data) return false

        const relationshipValues = Array.isArray(relationship.data) ? relationship.data : [relationship.data]

        const relationshipIDs = relationshipValues.map(relation => relation.id)

        return whitelist.some(
            filterElement => relationshipIDs.includes(filterElement.value)
        )
    }

    /**
     * @type {import("../../types/postProcessing").postProcessingHandler["action"]}
     */
    get action() {
        return async (request, response) => {
            const filters = request.processedFilter
            if (!filters) return

            if (Array.isArray(response.data)) {
                response.data = response.data.filter(
                    datum => {
                        if (!this.#filterKeepObject(datum, filters)) {
                            debug.filter("removed", JSON.stringify(filters), JSON.stringify(datum.attributes))
                            return false
                        }
                        return true
                    }
                )
            } else if (response.data instanceof Object) {
                if (!this.#filterKeepObject(response.data, filters)) {
                    debug.filter("removed", JSON.stringify(filters), JSON.stringify(response.data.attributes))
                    throw new JsonAPIError(
                        "404",
                        "ENOTFOUND",
                        "Requested resource does not exist",
                        `There is no ${request.params.type} with id ${request.params.id} which satisfies ${request.params.filter}`
                    )
                }
            }
        }
    }
}

module.exports = Filter