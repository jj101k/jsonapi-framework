"use strict"

const {Handler} = require("./Handler")

/**
 *
 */
class ChainHandler extends Handler {
    /**
     * This is here to help you upgrade from olde async chains to modern promises.
     *
     * It deliberately DOES NOT support an entire chain at once - the whole
     * point is to have one "await" per thing to wait for.
     *
     * You usually won't need to use this directly.
     *
     * @see chainObjectToPromise
     *
     * @param {(callback: (err, ...results) => any)} f
     * @returns
     */
    static #chainToPromise(f) {
        return new Promise((resolve, reject) => f((err, ...results) => {
            if(err) {
                reject(err)
            } else {
                resolve(results)
            }
        }))
    }

    /**
     * This is here to help you upgrade from olde async chains to modern promises.
     *
     * This converts a whole object at once, and is inspired by promisify
     *
     * @template T
     * @param {T} o
     * @param {(string & keyof T)[]} methods
     * @returns
     */
    static chainObjectToPromise(o, ...methods) {
        return new Proxy(
            o,
            {
                get(o, n) {
                    if(methods.includes(n)) {
                        return (...args) => ChainHandler.#chainToPromise(f => o[n](...args, f))
                    } else {
                        return o[n]
                    }
                }
            }
        )
    }

    /**
     *
     * @param {*} argsIn
     * @param {string} action
     * @param {*} request
     * @param {(err, ...results) => any} callback
     * @returns
     */
    async #asyncAction(argsIn, action, request, callback) {
        const lowerAction = action.toLowerCase()

        let args = argsIn
        try {
            if (this[`before${action}`]) {
                args = await ChainHandler.#chainToPromise(cb => this[`before${action}`](...args, cb))
            }
            args = await ChainHandler.#chainToPromise(cb => this.otherHandler[lowerAction](...args, cb))
            if (this[`after${action}`]) {
                args = await ChainHandler.#chainToPromise(cb => this[`after${action}`](request, ...args, cb))
            }
        } catch(err) {
            callback(err)
            return
        }
        callback(null, ...args)
    }

    /**
     *
     * @param {string} action
     * @returns
     */
    #buildAction(action) {
        const lowerAction = action.toLowerCase()
        return (request, ...args) => {
            const argsIn = [request, ...args]

            if(argsIn[argsIn.length - 1] instanceof Function) {
                const callback = argsIn.pop()
                this.#asyncAction(argsIn, action, request, callback)
            } else {
                // This block catches invocations to synchronous functions (.initialise())
                if (this[`before${action}`]) {
                    this[`before${action}`](...argsIn)
                }
                if (typeof this.otherHandler[lowerAction] === "function") {
                    // sync functions like .initialise() and .close() are optional
                    this.otherHandler[lowerAction](...argsIn)
                }
                if (this[`after${action}`]) {
                    this[`after${action}`](...argsIn)
                }
            }
        }
    }

    /**
     *
     * @param {ChainHandler} otherHandler
     * @returns
     */
    chain(otherHandler) {
        if (otherHandler.handlesSort) {
            this.handlesSort = true
        }
        if (otherHandler.handlesFilter) {
            this.handlesFilter = true
        }
        if (this.otherHandler instanceof ChainHandler) {
            this.otherHandler.chain(otherHandler)
            return this
        }
        this.otherHandler = otherHandler
        this.ready = true
        return this
    }

    initialise = this.#buildAction("Initialise")

    close = this.#buildAction("Close")

    search = this.#buildAction("Search")

    find = this.#buildAction("Find")

    create = this.#buildAction("Create")

    delete = this.#buildAction("Delete")

    update = this.#buildAction("Update")
}

module.exports = ChainHandler
