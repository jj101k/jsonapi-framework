"use strict"

const JsonAPIError = require("../JsonAPIError")
const RetainsJsonApi = require("../RetainsJsonApi")
const utilities = require("../utilities")

/**
 *
 */
class Fields extends RetainsJsonApi {
    /**
     * @type {import("../../types/postProcessing").postProcessingHandler["action"]}
     */
    get action() {
        return async (request, response) => {
            const resourceList = request.params.fields
            if (!(resourceList instanceof Object)) return

            /**
             * @type {{[key: string]: string[]}}
             */
            const fieldsByResourceType = {}

            const missingResources = Object.keys(resourceList).filter(
                resourceType => !this.jsonApi._resources[resourceType]
            )
            if(missingResources.length) {
                throw new JsonAPIError(
                    "403",
                    "EFORBIDDEN",
                    "Invalid field resource",
                    `${missingResources} are not valid resources`
                )
            }

            for (const [resourceType, fields] of Object.entries(resourceList)) {
                const resourceSpec = this.jsonApi._resources[resourceType]

                fieldsByResourceType[resourceType] = utilities.commaSeparatedArray(fields)

                const missingFields = fieldsByResourceType[resourceType].filter(
                    field => !resourceSpec.attributes[field]
                )
                if(missingFields.length) {
                    throw new JsonAPIError(
                        "403",
                        "EFORBIDDEN",
                        "Invalid field selection",
                        `${resourceType} does not have properties: ${missingFields}`
                    )
                }
            }

            const primaryData = Array.isArray(response.data) ? response.data : [response.data]

            for(const dataItem of [...response.included, ...primaryData]) {
                const allowedFields = fieldsByResourceType[dataItem.type]
                for(const attribute of Object.keys(dataItem.attributes)) {
                    if (allowedFields && !allowedFields.includes(attribute)) {
                        delete dataItem.attributes[attribute]
                    }
                }
            }
        }
    }
}

module.exports = Fields