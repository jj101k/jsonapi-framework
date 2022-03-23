'use strict'

const debug = require('./debugging')

/**
 *
 */
class handlerEnforcer {
    /**
     *
     * @param {*} handlers
     * @returns
     */
    static wrapped(handlers) {
        return {
            ...handlers,
            create: this.#create(handlers),
            delete: this.#delete(handlers),
            find: this.#find(handlers),
            search: this.#search(handlers),
            update: this.#update(handlers),
        }
    }

    /**
     *
     * @param {{[operation: string]: Function | null}} handlers
     * @param {string} operation
     * @param {number} outCount
     * @returns
     */
    static #wrapHandler(handlers, operation, outCount) {
        if (typeof outCount !== 'number') {
            throw new Error('Invalid use of handlerEnforcer._wrapHandler!')
        }

        const original = handlers[operation]
        if (!original) return null
        /**
         * @param {import("express").Request} request
         * @param {[...any[], Function]} args
         */
        return (request, ...args) => {
            const requestParams = request.params
            const callback = args[args.length - 1]
            args[args.length - 1] = (...args) => {
                const keepArgs = args.slice(0, outCount)
                // $FlowFixMe: We've already ruled out any other possible types for outCount?
                while (keepArgs.length < outCount) {
                    keepArgs.push(null)
                }
                debug.handler[operation](JSON.stringify(requestParams), JSON.stringify(keepArgs))
                return callback.apply(null, keepArgs)
            }
            return original.apply(handlers, [request, ...args])
        }
    }

    /**
     *
     * @param {*} handlers
     * @returns
     */
    static #search = handlers => this.#wrapHandler(handlers, 'search', 3)

    /**
     *
     * @param {*} handlers
     * @returns
     */
    static #find = handlers => this.#wrapHandler(handlers, 'find', 2)

    /**
     *
     * @param {*} handlers
     * @returns
     */
    static #create = handlers => this.#wrapHandler(handlers, 'create', 2)

    /**
     *
     * @param {*} handlers
     * @returns
     */
    static #update = handlers => this.#wrapHandler(handlers, 'update', 2)

    /**
     *
     * @param {*} handlers
     * @returns
     */
    static #delete = handlers => this.#wrapHandler(handlers, 'delete', 1)
}


module.exports = handlerEnforcer