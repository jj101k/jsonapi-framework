"use strict"

const fs = require("fs")
const path = require("path")
const postProcessClass = require("../postProcess")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const helperClass = require("./helper")

/**
 * @typedef {import("../jsonApiPrivate")} jsonApiPrivate
 */

/**
 * @typedef {import("../jsonApi")} jsonApi
 */

/**
 *
 */
class Routes extends RetainsJsonApiPrivate {
    /**
     * @type {{new(privateData: jsonApiPrivate, helper: import("./helper"), postProcess: import("../postProcess"),
     * jsonApi: jsonApi): import("./BaseRoute") | import("./BaseError")}}
     */
    #handlerClasses = []

    /**
     * @type {helperClass}
     */
    #helper

    /**
     *
     * @param {jsonApi} jsonApi
     * @param {jsonApiPrivate} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)
        const handlerPath = path.join(__dirname, "handlers")
        for(const filename of fs.readdirSync(handlerPath).sort()) {
            this.#handlerClasses.push(require(path.join(handlerPath, filename)))
        }
        const errorPath = path.join(__dirname, "errors")
        /**
         * @type {{new(privateData: jsonApiPrivate, helper: import("./helper"), postProcess: import("../postProcess"),
     * jsonApi: jsonApi): import("./BaseError"), order?: number}[]}
         */
        const errorClasses = fs.readdirSync(errorPath).sort().map(
            filename => require(path.join(errorPath, filename))
        )
        this.#handlerClasses.push(...errorClasses.sort((a, b) => (a.order || 0) - (b.order || 0)))
        this.#helper = new helperClass(jsonApi, privateData)
    }

    /**
     *
     */
    register() {
        const postProcess = new postProcessClass(this.jsonApi, this.privateData)
        for (const HandlerClass of this.#handlerClasses) {
            const handler = new HandlerClass(this.privateData, this.#helper, postProcess, this.jsonApi)
            handler.bind()
        }
    }
}

module.exports = Routes