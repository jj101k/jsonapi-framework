'use strict'

const fs = require('fs')
const path = require('path')
const postProcessClass = require('../postProcess')
const RetainsJsonApiPrivate = require('../RetainsJsonApiPrivate')
const helperClass = require('./helper')

/**
 *
 */
class routesClass extends RetainsJsonApiPrivate {
    /**
     *
     */
    handlerClasses = []

    /**
     * @type {helperClass}
     */
    helper

    /**
     *
     * @param {import("../jsonApi")} jsonApi
     * @param {import("../jsonApiPrivate")} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)
        const handlerPath = `${__dirname}/handlers`
        for(const filename of fs.readdirSync(handlerPath).sort()) {
            this.handlerClasses.push(require(path.join(handlerPath, filename)))
        }

        this.helper = new helperClass(jsonApi, privateData)
    }

    /**
     *
     */
    register() {
        const postProcess = new postProcessClass(this.jsonApi, this.privateData)
        for (const handlerClass of this.handlerClasses) {
            const handler = new handlerClass(this.privateData, this.helper, postProcess, this.jsonApi)
            handler.bind()
        }
    }
}

module.exports = routesClass