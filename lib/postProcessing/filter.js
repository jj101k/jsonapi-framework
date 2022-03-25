'use strict'
const debug = require('../debugging')

/**
 * @typedef {">" | "<" | "~" | ":"} operatorType
 */

/**
 * @typedef {{operator?: operatorType, value: any}} filterType
 */

/**
 *
 */
class filterClass {
    /**
     *
     */
    get #filterFunction() {
        return {
            '>': (attrValue, filterValue) => attrValue > filterValue,
            '<': (attrValue, filterValue) => attrValue < filterValue,
            '~': (attrValue, filterValue) => attrValue.toLowerCase() === filterValue.toLowerCase(),
            ':': (attrValue, filterValue) => attrValue.toLowerCase().indexOf(filterValue.toLowerCase()) !== -1,
        }
    }

    /**
     *
     * @param {*} attributeValue
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
     * @param {{[key: string]: any}} someObject
     * @param {{[key: string]: filterType[]}} filters
     * @returns
     */
    #filterKeepObject(someObject, filters) {
        for (const filterName in filters) {
            const whitelist = filters[filterName]

            if (filterName === 'id') {
                if(!this.#attributesMatchesOR(someObject.id, whitelist)) {
                    return false
                }
            } else if (someObject.attributes.hasOwnProperty(filterName)) {
                if(!this.#attributesMatchesOR(someObject.attributes[filterName], whitelist)) {
                    return false
                }
            } else if (someObject.relationships.hasOwnProperty(filterName)) {
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
     * @param {any} attributeValue
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
     * @param {{data?: {id: string} | {id: string}[]}} relationship
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
                            debug.filter('removed', JSON.stringify(filters), JSON.stringify(datum.attributes))
                            return false
                        }
                        return true
                    }
                )
            } else if (response.data instanceof Object) {
                if (!this.#filterKeepObject(response.data, filters)) {
                    debug.filter('removed', JSON.stringify(filters), JSON.stringify(response.data.attributes))
                    throw {
                        status: '404',
                        code: 'ENOTFOUND',
                        title: 'Requested resource does not exist',
                        detail: `There is no ${request.params.type} with id ${request.params.id} which satisfies ${request.params.filter}`
                    }
                }
            }
        }
    }
}

module.exports = filterClass