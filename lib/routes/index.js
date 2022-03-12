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
    handlers = { }

    /**
     * @type {helperClass}
     */
    helper

    /**
     *
     * @param {*} jsonApi
     * @param {*} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)
        fs.readdirSync(__dirname).filter(filename => /\.js$/.test(filename) && (filename !== 'index.js') && (filename !== 'helper.js')).sort().forEach(filename => {
            this.handlers[filename] = require(path.join(__dirname, filename))
        })

        this.helper = new helperClass(jsonApi, privateData)
    }

    /**
     *
     */
    register() {
        const postProcess = new postProcessClass(this.jsonApi, this.privateData)
        for (const i in this.handlers) {
            this.handlers[i].register(this.privateData, this.helper, postProcess, this.jsonApi)
        }
    }
}

module.exports = routesClass