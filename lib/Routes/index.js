"use strict"

const fs = require("fs")
const path = require("path")
const PostProcess = require("../postProcess")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")

/**
 * @typedef {import("../jsonApiPrivate")} jsonApiPrivate
 * @typedef {import("../jsonApi")} jsonApi
 */

/**
 *
 */
class Routes extends RetainsJsonApiPrivate {
    /**
     * @type {{new(privateData: jsonApiPrivate, router: import("../router"),
     * jsonApi: jsonApi): import("./BaseError"), order?: number}[]}
     */
    #errorClasses = []

    /**
     * @type {{new(privateData: jsonApiPrivate, postProcess: import("../postProcess"),
     * jsonApi: jsonApi): import("./BaseRoute")}[]}
     */
    #routeClasses = []

    /**
     *
     * @param {jsonApi} jsonApi
     * @param {jsonApiPrivate} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)
        const preroutingPath = path.join(__dirname, "prerouting")
        for(const filename of fs.readdirSync(preroutingPath).sort()) {
            this.#routeClasses.push(require(path.join(preroutingPath, filename)))
        }
        const handlerPath = path.join(__dirname, "handlers")
        for(const filename of fs.readdirSync(handlerPath).sort()) {
            this.#routeClasses.push(require(path.join(handlerPath, filename)))
        }
        const errorPath = path.join(__dirname, "errors")
        this.#errorClasses = fs.readdirSync(errorPath).sort().map(
            filename => require(path.join(errorPath, filename))
        )
        this.#errorClasses.sort((a, b) => (a.order || 0) - (b.order || 0))
    }

    /**
     *
     */
    register() {
        const postProcess = new PostProcess(this.jsonApi, this.privateData)
        for (const RouteClass of this.#routeClasses) {
            const router = new RouteClass(this.privateData, postProcess, this.jsonApi)
            router.bind()
        }
        for (const ErrorClass of this.#errorClasses) {
            const errorHandler = new ErrorClass(this.privateData, this.privateData.router, this.jsonApi)
            errorHandler.bind()
        }
    }
}

module.exports = Routes