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
     * @param {import("../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string} key
     * @throws
     */
    static #assertRelationshipIsNotForeign(resourceConfig, key) {
        if (SchemaHelper.forOptional(resourceConfig.attributes[key])?.isBelongsToRelationship) {
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
     * @param {import("joi").Schema | null} attributeConfig
     * @throws
     */
    static #assertStringOnlyOperator(operator, attributeConfig) {
        if (
            operator && attributeConfig && STRING_ONLY_OPERATORS.includes(operator) &&
            SchemaHelper.for(attributeConfig).type !== "string"
        ) {
            throw new Error(`operator ${operator} can only be applied to string attributes`)
        }
    }

    /**
     *
     * @param {import("joi").Schema | null} attributeConfig
     * @param {string | null} scalarElement
     * @returns
     */
    static #parseScalarFilterElementAssert(attributeConfig, scalarElement) {
        if (!scalarElement) {
            throw new Error("invalid or empty filter element")
        }

        const splitElement = this.#splitElement(scalarElement)
        if (!splitElement) {
            throw new Error("empty filter")
        }

        this.#assertStringOnlyOperator(splitElement.operator, attributeConfig)

        if(!attributeConfig) {
            throw new Error("No attribute config")
        }

        if (SchemaHelper.for(attributeConfig).isRelationship) { // relationship attribute: no further validation
            return splitElement
        }

        const validateResult = attributeConfig.validate(splitElement.value)
        if (validateResult.error) {
            throw validateResult.error.message
        }

        return {operator: splitElement.operator, value: validateResult.value}
    }

    /**
     *
     * @param {import("joi").Schema | null} attributeConfig
     * @param {string | string[] | null} filterElement
     * @throws
     * @returns
     */
    static #parseFilterElementHelperAssert(attributeConfig, filterElement) {
        if (!filterElement) {
            throw new Error("invalid or empty filter element")
        }

        const filterElements = Array.isArray(filterElement) ? filterElement : [filterElement]
        /**
         * @type {{operator: string, value: string}[]}
         */
        const parsedElements = []
        let errors = null
        for(const scalarElement of filterElements) {
            try {
                parsedElements.push(this.#parseScalarFilterElementAssert(attributeConfig, scalarElement))
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
     * @param {import("joi").Schema | null} attributeConfig
     * @param {string | string[] | null} filterElement
     * @throws
     * @returns
     */
    static #parseFilterElementAndAssert(attributeName, attributeConfig, filterElement) {
        try {
            return this.#parseFilterElementHelperAssert(attributeConfig, filterElement)
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
     * @param {import("express").Request} request
     * @throws
     */
    static parseAndAssertValid(request) {
        if (!request.params.filter) return

        /**
         * @type {import("../types/jsonApi").ResourceConfig}
         */
        const resourceConfig = request.resourceConfig

        /**
         * @type {{[key: string]: {operator: string, value: string}[]}}
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
            this.#assertRelationshipIsNotForeign(resourceConfig, key)

            const parsedFilterElement = this.#parseFilterElementAndAssert(key, resourceConfig.attributes[key], filterElements)

            processedFilter[key] = Array.isArray(parsedFilterElement) ?
                parsedFilterElement :
                [parsedFilterElement]
        }

        request.processedFilter = processedFilter
    }
}

module.exports = filter