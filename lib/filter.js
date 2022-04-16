"use strict"

const JsonAPIError = require("./JsonAPIError")

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
     * @returns
     */
    static #resourceDoesNotHaveProperty(resourceConfig, key) {
        if (resourceConfig.attributes[key]) return null
        return new JsonAPIError(
            "403",
            "EFORBIDDEN",
            "Invalid filter",
            `${resourceConfig.resource} do not have attribute or relationship '${key}'`
        )
    }

    /**
     *
     * @param {import("../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string} key
     * @returns
     */
    static #relationshipIsForeign(resourceConfig, key) {
        const relationSettings = resourceConfig.attributes[key]._settings
        if (!relationSettings || !relationSettings.__as) return null
        return new JsonAPIError(
            "403",
            "EFORBIDDEN",
            "Invalid filter",
            `Filter relationship '${key}' is a foreign reference and does not exist on ${resourceConfig.resource}`
        )
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
     * @returns
     */
    static #stringOnlyOperator(operator, attributeConfig) {
        if (!operator || !attributeConfig) return null
        if (STRING_ONLY_OPERATORS.includes(operator) && attributeConfig._type !== "string") {
            return `operator ${operator} can only be applied to string attributes`
        } else {
            return null
        }
    }

    /**
     *
     * @param {import("joi").Schema | null} attributeConfig
     * @param {string | null} scalarElement
     * @returns
     */
    static #parseScalarFilterElement(attributeConfig, scalarElement) {
        if (!scalarElement) return {error: "invalid or empty filter element"}

        const splitElement = this.#splitElement(scalarElement)
        if (!splitElement) return {error: "empty filter"}

        const error = this.#stringOnlyOperator(splitElement.operator, attributeConfig)
        if (error) return {error}

        if (attributeConfig._settings) { // relationship attribute: no further validation
            return {result: splitElement}
        }

        const validateResult = attributeConfig.validate(splitElement.value)
        if (validateResult.error) {
            return {error: validateResult.error.message}
        }

        const validatedElement = {operator: splitElement.operator, value: validateResult.value}
        return {result: validatedElement}
    }

    /**
     *
     * @param {import("joi").Schema | null} attributeConfig
     * @param {string | string[] | null} filterElement
     * @returns
     */
    static #parseFilterElementHelper(attributeConfig, filterElement) {
        if (!filterElement) return {error: "invalid or empty filter element"}

        const filterElements = Array.isArray(filterElement) ? filterElement : [filterElement]
        const parsedElements = filterElements.map(scalarElement => this.#parseScalarFilterElement(attributeConfig, scalarElement))

        if (parsedElements.length === 1) return parsedElements[0]

        let errors = null
        for(const element of parsedElements) {
            if(element.error) {
                if(!errors) errors = []
                errors.push(element.error)
            }
        }

        if (errors) return {error: errors}

        return {result: parsedElements.map(element => element.result)}
    }

    /**
     *
     * @param {string} attributeName
     * @param {import("joi").Schema | null} attributeConfig
     * @param {string | string[] | null} filterElement
     * @returns
     */
    static #parseFilterElement(attributeName, attributeConfig, filterElement) {
        const helperResult = this.#parseFilterElementHelper(attributeConfig, filterElement)

        if (helperResult.error) {
            return {
                error: new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid filter",
                    `Filter value for key '${attributeName}' is invalid: ${helperResult.error}`
                ),
            }
        } else {
            return {result: helperResult.result}
        }
    }

    /**
     *
     * @param {import("express").Request} request
     * @returns
     */
    static parseAndValidate(request) {
        if (!request.params.filter) return null

        /**
         * @type {import("../types/jsonApi").ResourceConfig}
         */
        const resourceConfig = request.resourceConfig

        const processedFilter = { }

        for (const key in request.params.filter) {
            const filterElement = request.params.filter[key]

            if (!Array.isArray(filterElement) && filterElement instanceof Object) continue // skip deep filters

            let filterElements
            if (typeof filterElement === "string") {
                filterElements = filterElement.split(FILTER_SEPERATOR)
            } else {
                filterElements = filterElement
            }

            const error = this.#resourceDoesNotHaveProperty(resourceConfig, key) ||
                this.#relationshipIsForeign(resourceConfig, key)
            if (error) return error

            const parsedFilterElement = this.#parseFilterElement(key, resourceConfig.attributes[key], filterElements)
            if (parsedFilterElement.error) return parsedFilterElement.error

            const results = Array.isArray(parsedFilterElement.result) ?
                parsedFilterElement.result :
                [parsedFilterElement.result]
            processedFilter[key] = results
        }

        request.processedFilter = processedFilter

        return null
    }
}

module.exports = filter