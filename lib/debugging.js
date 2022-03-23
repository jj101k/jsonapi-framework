'use strict'
const debug = require('debug')

/**
 *
 */
class debugging {
    /**
     *
     */
    static errors = debug('jagql:errors')
    /**
     *
     */
    static filter = debug('jagql:filter')
    /**
     *
     */
    static handler = {
        search: debug('jagql:handler:search'),
        find: debug('jagql:handler:find'),
        create: debug('jagql:handler:create'),
        update: debug('jagql:handler:update'),
        delete: debug('jagql:handler:delete')
    }
    /**
     *
     */
    static include = debug('jagql:include')
    /**
     *
     */
    static requestCounter = debug('jagql:requestCounter')
    /**
     *
     */
    static reroute = debug('jagql:reroute')
    /**
     *
     */
    static validationError = debug('jagql:validation:error')
    /**
     *
     */
    static validationInput = debug('jagql:validation:input')
    /**
     *
     */
    static validationOutput = debug('jagql:validation:output')

    /**
     *
     * @param {(namespace: string) => import("debug").Debugger} outputFnFactory
     */
    __overrideDebugOutput(outputFnFactory) {
        for(const [key, property] of Object.entries(this)) {
            if(!key.match(/^__/)) {
                if (property instanceof Function) {
                    this[key] = outputFnFactory(property.namespace)
                } else {
                    this.__overrideDebugOutput(property, outputFnFactory)
                }
            }
        }
    }
}

module.exports = debugging