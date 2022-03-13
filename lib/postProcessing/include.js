'use strict'

const rerouter = require('../rerouter')
const async = require('async')
const debug = require('../debugging')
const RetainsJsonApiPrivate = require('../RetainsJsonApiPrivate')

/**
 *
 */
class includeClass extends RetainsJsonApiPrivate {
    /**
     *
     */
    get action() {
        return (request, response, callback) => {
            let includes = request.params.include
            const filters = request.params.filter
            if (!includes) return callback()
            includes = (`${includes}`).split(',')

            this._arrayToTree(request, includes, filters, (attErr, includeTree) => {
                if (attErr) return callback(attErr)

                let dataItems = response.data
                if (!(Array.isArray(dataItems))) dataItems = [ dataItems ]
                includeTree._dataItems = dataItems

                this._fillIncludeTree(includeTree, request, fiErr => {
                    if (fiErr) return callback(fiErr)

                    includeTree._dataItems = [ ]
                    response.included = this._getDataItemsFromTree(includeTree)
                    response.included = Object.values(Object.fromEntries(response.included.map(
                        someItem => [`${someItem.type}~~${someItem.id}`, someItem]
                    )))

                    return callback()
                })
            })
        }
    }

    /**
     *
     * @param {*} request
     * @param {*} includes
     * @param {*} filters
     * @param {*} callback
     * @returns
     */
    _arrayToTree(request, includes, filters, callback) {
        const validationErrors = [ ]
        const tree = {
            _dataItems: null,
            _resourceConfig: [ ].concat(request.resourceConfig)
        }

        const iterate = (text, node, filter) => {
            if (text.length === 0) return null
            const parts = text.split('.')
            const first = parts.shift()
            const rest = parts.join('.')
            if (!filter) filter = {}

            let resourceAttribute = node._resourceConfig.map(resourceConfig => {
                return resourceConfig.attributes[first]
            }).filter(a => a).pop()
            if (!resourceAttribute) {
                return validationErrors.push({
                    status: '403',
                    code: 'EFORBIDDEN',
                    title: 'Invalid inclusion',
                    detail: `${node._resourceConfig.resource} do not have property ${first}`
                })
            }
            resourceAttribute = resourceAttribute._settings.__one || resourceAttribute._settings.__many
            if (!resourceAttribute) {
                return validationErrors.push({
                    status: '403',
                    code: 'EFORBIDDEN',
                    title: 'Invalid inclusion',
                    detail: `${node._resourceConfig.resource}.${first} is not a relation and cannot be included`
                })
            }

            filter = filter[first] || { }

            if (Array.isArray(filter)) {
                filter = filter.filter(i => i instanceof Object).pop()
            }

            if (!node[first]) {
                node[first] = {
                    _dataItems: [ ],
                    _resourceConfig: resourceAttribute.map(a => this.jsonApi._resources[a]),
                    _filter: [ ]
                }

                if (!((Array.isArray(filter)) && (filter.length === 0))) {
                    for (const i in filter) {
                        if (!(typeof filter[i] === 'string' || (Array.isArray(filter[i])))) continue
                        node[first]._filter.push(`filter[${i}]=${filter[i]}`)
                    }
                }
            }
            iterate(rest, node[first], filter)
        }
        includes.forEach(include => {
            iterate(include, tree, filters)
        })

        if (validationErrors.length > 0) return callback(validationErrors)
        return callback(null, tree)
    }

    /**
     *
     * @param {*} tree
     * @returns
     */
    _getDataItemsFromTree(tree) {
        let items = tree._dataItems
        for (const i in tree) {
            if (i[0] !== '_') {
                items = items.concat(this._getDataItemsFromTree(tree[i]))
            }
        }
        return items
    }

    /**
     *
     * @param {*} includeTree
     * @param {*} request
     * @param {*} callback
     */
    _fillIncludeTree(includeTree, request, callback) {
        /** **
        includeTree = {
            _dataItems: [ ],
            _filter: { },
            _resourceConfig: { },
            person: { includeTree },
            booking: { includeTree }
        };
        ****/
        const includes = Object.keys(includeTree)

        const map = {
            /** @type {{[key: string]: string[]}} */
            primary: { },
            /** @type {{[key: string]: string[]}} */
            foreign: { }
        }
        includeTree._dataItems.forEach(dataItem => {
            if (!dataItem) return [ ]
            return Object.keys(dataItem.relationships || { }).filter(keyName => (keyName[0] !== '_') && (includes.indexOf(keyName) !== -1)).forEach(relation => {
                const someRelation = dataItem.relationships[relation]

                if (someRelation.meta.relation === 'primary') {
                    let relationItems = someRelation.data
                    if (!relationItems) return
                    if (!(Array.isArray(relationItems))) relationItems = [ relationItems ]
                    relationItems.forEach(relationItem => {
                        const key = `${relationItem.type}~~${relation}~~${relation}`
                        map.primary[key] = map.primary[key] || [ ]
                        map.primary[key].push(relationItem.id)
                    })
                }

                if (someRelation.meta.relation === 'foreign') {
                    const key = `${someRelation.meta.as}~~${someRelation.meta.belongsTo}~~${relation}`
                    map.foreign[key] = map.foreign[key] || [ ]
                    map.foreign[key].push(dataItem.id)
                }
            })
        })

        const resourcesToFetch = []

        Object.keys(map.primary).forEach(relation => {
            let ids = Object.keys(Object.fromEntries(map.primary[relation].map(id => [id, true])))
            const parts = relation.split('~~')
            const urlJoiner = '&filter[id]='
            ids = urlJoiner + ids.join(urlJoiner)
            if (includeTree[parts[1]]._filter) {
                ids += `&${includeTree[parts[1]]._filter.join('&')}`
            }
            resourcesToFetch.push({
                url: `${this.jsonApi._apiConfig.base + parts[0]}/?${ids}`,
                as: relation
            })
        })

        Object.keys(map.foreign).forEach(relation => {
            let ids = Object.keys(Object.fromEntries(map.foreign[relation].map(id => [id, true])))
            const parts = relation.split('~~')
            const urlJoiner = `&filter[${parts[0]}]=`
            ids = urlJoiner + ids.join(urlJoiner)
            if (includeTree[parts[2]]._filter) {
                ids += `&${includeTree[parts[2]]._filter.join('&')}`
            }
            resourcesToFetch.push({
                url: `${this.jsonApi._apiConfig.base + parts[1]}/?${ids}`,
                as: relation
            })
        })

        async.map(resourcesToFetch, (related, done) => {
            const parts = related.as.split('~~')
            debug.include(related)

            new rerouter(this.jsonApi, this.privateData).route({
                method: 'GET',
                uri: related.url,
                originalRequest: request
            }, (err, json) => {
                if (err) {
                    debug.include('!!', JSON.stringify(err))
                    return done(err.errors)
                }

                let data = json.data
                if (!data) return done()
                if (!(Array.isArray(data))) data = [ data ]
                includeTree[parts[2]]._dataItems = includeTree[parts[2]]._dataItems.concat(data)
                return done()
            })
        }, err => {
            if (err) return callback(err)

            async.map(includes, (include, done) => {
                if (include[0] === '_') return done()
                this._fillIncludeTree(includeTree[include], request, done)
            }, callback)
        })
    }
}

module.exports = includeClass