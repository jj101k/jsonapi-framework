"use strict"

const JsonAPIError = require("./JsonAPIError")
const SchemaHelper = require("./SchemaHelper")

const FILTER_OPERATORS = ["<", ">", "~", ":"]
const STRING_ONLY_OPERATORS = ["~", ":"]
const FILTER_SEPERATOR = ","

/**
 *
 */
class filter {
    /**
     *
     * @param {import("../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string} key
     * @throws
     */
    static #assertResourceHasProperty(resourceConfig, key) {
        if (!resourceConfig.attributes[key]) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid filter",
                `${resourceConfig.resource} do not have attribute or relationship '${key}'`
            )
        }
    }

    /**
     *
     * @param {SchemaHelper} helper
     * @param {import("../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string} key
     * @throws
     */
    static #assertRelationshipIsNotForeign(helper, resourceConfig, key) {
        if (helper.isBelongsToRelationship) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid filter",
                `Filter relationship '${key}' is a foreign reference and does not exist on ${resourceConfig.resource}`
            )
        }
    }

    /**
     *
     * @param {string | null} element
     * @returns
     */
    static #splitElement(element) {
        if (!element) return null
        if (FILTER_OPERATORS.includes(element[0])) {
            return {operator: element[0], value: element.substring(1)}
        } else {
            return {operator: null, value: element}
        }
    }

    /**
     *
     * @param {string | null} operator
     * @param {SchemaHelper} helper
     * @throws
     */
    static #assertStringOnlyOperator(operator, helper) {
        if (
            operator && STRING_ONLY_OPERATORS.includes(operator) &&
            helper.type !== "string"
        ) {
            throw new Error(`operator ${operator} can only be applied to string attributes`)
        }
    }

    /**
     *
     * @param {SchemaHelper} helper
     * @param {string | null} scalarElement
     * @returns
     */
    static #parseScalarFilterElementAssert(helper, scalarElement) {
        if (!scalarElement) {
            throw new Error("invalid or empty filter element")
        }

        const splitElement = this.#splitElement(scalarElement)
        if (!splitElement) {
            throw new Error("empty filter")
        }

        this.#assertStringOnlyOperator(splitElement.operator, helper)

        if (helper.isRelationship) { // relationship attribute: no further validation
            return splitElement
        }

        const validateResult = helper.validate(splitElement.value)
        if (validateResult.error) {
            throw validateResult.error.message
        }

        return {operator: splitElement.operator, value: validateResult.value}
    }

    /**
     *
     * @param {SchemaHelper} helper
     * @param {string | string[] | null} filterElement
     * @throws
     * @returns
     */
    static #parseFilterElementHelperAssert(helper, filterElement) {
        if (!filterElement) {
            throw new Error("invalid or empty filter element")
        }

        const filterElements = Array.isArray(filterElement) ? filterElement : [filterElement]
        /**
         * @type {{operator: string | null, value: string}[]}
         */
        const parsedElements = []
        let errors = null
        for(const scalarElement of filterElements) {
            try {
                parsedElements.push(this.#parseScalarFilterElementAssert(helper, scalarElement))
            } catch(e) {
                if(!errors) errors = []
                errors.push(e)
            }
        }

        if (parsedElements.length === 1) return parsedElements[0]

        if (errors) {
            throw errors
        }

        return parsedElements
    }

    /**
     *
     * @param {string} attributeName
     * @param {SchemaHelper} helper
     * @param {string | string[] | null} filterElement
     * @throws
     * @returns
     */
    static #parseFilterElementAndAssert(attributeName, helper, filterElement) {
        try {
            return this.#parseFilterElementHelperAssert(helper, filterElement)
        } catch(e) {
            throw new JsonAPIError(
                "403",
                "EFORBIDDEN",
                "Invalid filter",
                `Filter value for key '${attributeName}' is invalid: ${e}`
            )
        }
    }

    /**
     *
     * @param {import("../types/Handler").JsonApiRequest} request
     * @throws
     */
    static parseAndAssertValid(request) {
        if (!request.params.filter) return

        if(!request.resourceConfig) {
            throw new Error("Resource config missing")
        }

        /**
         * @type {import("../types/jsonApi").ResourceConfig}
         */
        const resourceConfig = request.resourceConfig

        /**
         * @type {{[key: string]: {operator: string | null, value: string}[]}}
         */
        const processedFilter = { }

        for (const [key, filterElement] of Object.entries(request.params.filter || {})) {
            if (typeof filterElement == "object" && !Array.isArray(filterElement)) {
                continue // skip deep filters
            }

            const filterElements = (typeof filterElement === "string") ?
                filterElement.split(FILTER_SEPERATOR) :
                filterElement

            this.#assertResourceHasProperty(resourceConfig, key)
            const helper = SchemaHelper.for(resourceConfig.attributes[key])
            this.#assertRelationshipIsNotForeign(helper, resourceConfig, key)

            const parsedFilterElement = this.#parseFilterElementAndAssert(key, helper, filterElements)

            processedFilter[key] = Array.isArray(parsedFilterElement) ?
                parsedFilterElement :
                [parsedFilterElement]
        }

        request.processedFilter = processedFilter
    }
}

module.exports = filter