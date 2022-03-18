'use strict'

const debug = require('./debugging')
const rerouter = require('./rerouter')
const async = require('async')
const fieldsClass = require('./postProcessing/fields')
const filterClass = require('./postProcessing/filter')
const includeClass = require('./postProcessing/include')
const sortClass = require('./postProcessing/sort')
const RetainsJsonApiPrivate = require('./RetainsJsonApiPrivate')

// sometimes the resourceConfig is an object... sometimes it's an array.
function getHandlerFromRequest (request) {
    let rc = request.resourceConfig || {}
    if (rc instanceof Array) {
        rc = rc[0] || {}
    }
    return rc.handlers || {}
}

/**
 *
 */
class postProcessClass extends RetainsJsonApiPrivate {
    /**
     *
     * @param {*} jsonApi
     * @param {*} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi, privateData)

        this._applySort = new sortClass().action
        this._applyFilter = new filterClass().action
        this._applyIncludes = new includeClass(this.jsonApi, this.privateData).action
        this._applyFields = new fieldsClass(this.jsonApi).action
    }

    /**
     *
     * @param {*} request
     * @param {*} response
     * @param {*} callback
     */
    handle(request, response, callback) {
        let handler = getHandlerFromRequest(request)
        let tasks = [
            { name: 'sort', fn: '_applySort', skip: 'handlesSort' },
            { name: 'filter', fn: '_applyFilter', skip: 'handlesFilter' },
            // not permitting handlers to skip includes or fields, since these two steps cross the bounds into
            // other handlers' data.
            { name: 'includes', fn: '_applyIncludes' },
            { name: 'fields', fn: '_applyFields' }
        ].reduce((tasks, step) => {
            // short circuit if a custom handler claims to already have done the postprocess step
            // (e.g. if a handler is generating a database query that is already returning the records in the correct order,
            // it can set handlesSort = true on itself)
            if (step.skip && handler[step.skip]) return tasks

            tasks.push(next => {
                // declare that we are entering a postprocess step.
                // this will allow custom handlers to optionally provide alternative logic pathes when doing postprocess
                // steps like fetching foreign key records for 'includes', etc. (i.e. it will allow the custom handler to
                // differentiate a GET /:type request and a rerouted include request GET /:type?include=other_type
                request.postProcess = step.name

                // call the post process step.
                // note, we're not using an 'arrow fn' here, since we need the 'arguments' list.
                this[step.fn](request, response, function () {
                    // delete postProcess field before passing on the results.
                    delete request.postProcess
                    next.apply(this, arguments)
                })
            })
            return tasks
        }, [])

        async.waterfall(tasks, err => callback(err))
    }

    /**
     *
     * @param {*} request
     * @param {*} mainResource
     * @param {*} callback
     * @returns
     */
    _fetchRelatedResources(request, mainResource, callback) {
        // Fetch the other objects
        let dataItems = mainResource[request.params.relation]

        if (!dataItems) return callback(null, [ null ], null)

        if (!(Array.isArray(dataItems))) dataItems = [ dataItems ]

        let resourcesToFetch = dataItems.reduce((map, dataItem) => {
            map[dataItem.type] = map[dataItem.type] || [ ]
            map[dataItem.type].push(dataItem.id)
            return map
        }, { })

        resourcesToFetch = Object.keys(resourcesToFetch).map(type => {
            let ids = resourcesToFetch[type]
            const urlJoiner = '&filter[id]='
            ids = urlJoiner + ids.join(urlJoiner)
            let uri = `${this.jsonApi._apiConfig.pathPrefix + type}/?${ids}`
            if (request.route.query) {
                uri += `&${request.route.query}`
            }
            return uri
        })

        let total = null
        async.map(resourcesToFetch, (related, done) => {
            debug.include(related)

            new rerouter(this.jsonApi, this.privateData).route({
                method: 'GET',
                uri: related,
                originalRequest: request,
                params: { filter: request.params.filter }
            }, (err, json) => {
                if (err) {
                    debug.include('!!', JSON.stringify(err))
                    return done(err.errors)
                }

                let data = json.data

                if (json.meta && json.meta.page) {
                    total = (total || 0) + json.meta.page.total
                }

                if (!(Array.isArray(data))) data = [ data ]

                return done(null, data)
            })
        }, (err, otherResources) => {
            if (err) return callback(err)
            const relatedResources = [].concat.apply([], otherResources)
            return callback(null, relatedResources, total)
        })
    }

    /**
     *
     * @param {*} request
     * @param {*} items
     * @param {*} schema
     * @param {*} callback
     * @returns
     */
    fetchForeignKeys(request, items, schema, callback) {
        if (!(Array.isArray(items))) {
            items = [ items ]
        }
        items.forEach(item => {
            for (const i in schema) {
                const settings = schema[i]._settings
                if (settings && settings.__as) {
                    item[i] = undefined
                }
            }
        })
        return callback()
    }
}

module.exports = postProcessClass