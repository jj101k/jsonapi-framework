"use strict"

const utilities = require("../utilities")

/**
 *
 */
class sortClass {
    /**
     * @type {import("../../types/postProcessing").postProcessingHandler["action"]}
     */
    get action() {
        return async (request, response) => {
            if (!request.params.sort) return
            const attributeSpec = utilities.stringIsh(request.params.sort)
            let ascending
            let attribute
            if (attributeSpec[0] === "-") {
                ascending = -1
                attribute = attributeSpec.substring(1, attribute.length)
            } else {
                ascending = 1
                attribute = attributeSpec
            }

            if (!request.resourceConfig.attributes[attribute]) {
                throw {
                    status: "403",
                    code: "EFORBIDDEN",
                    title: "Invalid sort",
                    detail: `${request.resourceConfig.resource} do not have property ${attribute}`
                }
            }

            response.data.sort((a, b) => {
                if (typeof a.attributes[attribute] === "string") {
                    return a.attributes[attribute].localeCompare(b.attributes[attribute]) * ascending
                } else if (typeof a.attributes[attribute] === "number" || a.attributes[attribute] instanceof Date) {
                    return (a.attributes[attribute] - b.attributes[attribute]) * ascending
                } else {
                    return 0
                }
            })
        }
    }
}

module.exports = sortClass