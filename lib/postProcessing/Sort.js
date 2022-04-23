"use strict"

const JsonAPIError = require("../JsonAPIError")
const utilities = require("../utilities")

/**
 * @typedef {import("../../types/postProcessing").Resource} Resource
 */

/**
 *
 */
class Sort {
    /**
     * Internal helper function to return a sorter from a request
     *
     * @param {import("../../types/postProcessing").postProcessingRequest} request
     * @returns {[(a: Resource, b: Resource) => number, string]}
     */
    static sorter(request) {
        const attributeSpec = utilities.stringIsh(request.params.sort)
        if (!attributeSpec) return

        let md
        if ((md = attributeSpec.match(/^-(.+)/))) {
            const attribute = md[1]
            return [
                (a, b) => {
                    const attrA = a[attribute]
                    const attrB = b[attribute]
                    if (typeof attrA === "string") {
                        return -attrA.localeCompare(attrB)
                    } else if (typeof attrA === "number") {
                        return -(attrA - attrB)
                    } else {
                        return 0
                    }
                },
                attribute
            ]
        } else {
            const attribute = attributeSpec
            return [
                (a, b) => {
                    const attrA = a[attribute]
                    const attrB = b[attribute]
                    if (typeof attrA === "string") {
                        return attrA.localeCompare(attrB)
                    } else if (typeof attrA === "number") {
                        return attrA - attrB
                    } else {
                        return 0
                    }
                },
                attribute
            ]
        }
    }

    /**
     * @type {import("../../types/postProcessing").postProcessingHandler["action"]}
     */
    get action() {
        return async (request, response) => {
            if (!request.params.sort) return
            const [sorter, attribute] = Sort.sorter(request)

            if (!request.resourceConfig.attributes[attribute]) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid sort",
                    `${request.resourceConfig.resource} do not have property ${attribute}`
                )
            }

            response.data.sort(sorter)
        }
    }
}

module.exports = Sort