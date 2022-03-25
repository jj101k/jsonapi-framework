'use strict'

const RetainsJsonApi = require("../RetainsJsonApi")
const utilities = require("../utilities")

/**
 *
 */
class fieldsClass extends RetainsJsonApi {
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
            const fields = {}
            for (const resource in resourceList) {
                if (!this.jsonApi._resources[resource]) {
                    throw {
                        status: '403',
                        code: 'EFORBIDDEN',
                        title: 'Invalid field resource',
                        detail: `${resource} is not a valid resource `
                    }
                }

                fields[resource] = utilities.commaSeparatedArray(resourceList[resource])

                for (const j of fields[resource]) {
                    if (!this.jsonApi._resources[resource].attributes[j]) {
                        throw {
                            status: '403',
                            code: 'EFORBIDDEN',
                            title: 'Invalid field selection',
                            detail: `${resource} does not have property ${j}`
                        }
                    }
                }
            }

            const primaryData = Array.isArray(response.data) ? response.data : [response.data]

            for(const dataItem of [...response.included, ...primaryData]) {
                for(const attribute of Object.keys(dataItem.attributes)) {
                    if (fields[dataItem.type] && !fields[dataItem.type].includes(attribute)) {
                        delete dataItem.attributes[attribute]
                    }
                }
            }
        }
    }
}

module.exports = fieldsClass