"use strict"
const debug = require("debug")

/**
 *
 */
class debugging {
    /**
     *
     */
    static errors = debug("jagql:errors")
    /**
     *
     */
    static filter = debug("jagql:filter")
    /**
     *
     */
    static handler = {
        search: debug("jagql:handler:search"),
        find: debug("jagql:handler:find"),
        create: debug("jagql:handler:create"),
        update: debug("jagql:handler:update"),
        delete: debug("jagql:handler:delete")
    }

    /**
     *
     */
    static include = debug("jagql:include")
    /**
     *
     */
    static requestCounter = debug("jagql:requestCounter")
    /**
     *
     */
    static reroute = debug("jagql:reroute")
    /**
     *
     */
    static validationError = debug("jagql:validation:error")
    /**
     *
     */
    static validationInput = debug("jagql:validation:input")
    /**
     *
     */
    static validationOutput = debug("jagql:validation:output")

    /**
     *
     * @param {{[key: string]: any}} o
     * @param {(namespace: string) => import("debug").Debugger} outputFnFactory
     */
    static #overrideDebugOutput(o, outputFnFactory) {
        for(const [key, property] of Object.entries(o)) {
            if(!key.match(/^__/)) {
                if (property instanceof Function) {
                    o[key] = outputFnFactory(property.namespace)
                } else {
                    this.#overrideDebugOutput(property, outputFnFactory)
                }
            }
        }
    }

    /**
     *
     * @param {(namespace: string) => import("debug").Debugger} outputFnFactory
     */
    __overrideDebugOutput(outputFnFactory) {
        return debugging.#overrideDebugOutput(this, outputFnFactory)
    }
}

module.exports = debugging