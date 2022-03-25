'use strict'

const debug = require('./debugging')
const url = require('qs')
const RetainsJsonApiPrivate = require('./RetainsJsonApiPrivate')

/**
 *
 */
class rerouter extends RetainsJsonApiPrivate {
    /**
     *
     * @param {*} newRequest
     */
    async route(newRequest) {
        const validRoutes = this.privateData.router._routes[newRequest.method.toLowerCase()]

        const path = this._generateSanePath(newRequest)
        const route = this._pickFirstMatchingRoute(validRoutes, path)

        const req = {
            url: newRequest.uri,
            originalUrl: newRequest.originalRequest.originalUrl,
            headers: newRequest.originalRequest.headers,
            cookies: newRequest.originalRequest.cookies,
            params: this._mergeParams(url.parse(newRequest.uri.split('?')[1] || { }), newRequest.params)
        }
        this._extendUrlParamsOntoReq(route, path, req)

        debug.reroute('Request', route, JSON.stringify(req))

        return new Promise((resolve, reject) => {
            const res = {
                set () { },
                status (httpCode) {
                    res.httpCode = httpCode
                    return res
                },
                end (payload) {
                    if (res.httpCode >= 400) {
                        debug.reroute('Error', payload.toString())
                        return reject(JSON.parse(payload.toString()))
                    }
                    if (newRequest.method !== 'GET') {
                        debug.reroute('Response', payload.toString())
                    }
                    const json = JSON.parse(payload.toString())
                    return resolve(json)
                }
            }
            const modifiedRequest = {...newRequest.originalRequest}
            delete modifiedRequest["params"]
            delete modifiedRequest["route"]
            validRoutes[route](req, res, modifiedRequest)
        })
    }

    /**
     *
     * @param {*} newRequest
     * @returns
     */
    _generateSanePath(newRequest) {
        let path = newRequest.uri
        if (path.match(/^https?:\/\//)) {
            path = path.split('/').slice(3).join('/')
        }
        if (this.jsonApi._apiConfig.base !== '/') {
            if (path[0] !== '/') path = `/${path}`
            path = path.split(this.jsonApi._apiConfig.base)
            path.shift()
            path = path.join(this.jsonApi._apiConfig.base)
        }
        path = path.replace(/^\//, '').split('?')[0].replace(/\/$/, '')
        return path
    }

    /**
     *
     * @param {*} validRoutes
     * @param {*} path
     * @returns
     */
    _pickFirstMatchingRoute(validRoutes, path) {
        return Object.keys(validRoutes).filter(someRoute => {
            someRoute = someRoute.replace(/(:[a-z]+)/g, '[^/]*?')
            someRoute = new RegExp(`^${someRoute}$`)
            return someRoute.test(path)
        }).pop()
    }

    /**
     *
     * @param {*} route
     * @param {*} path
     * @param {*} req
     */
    _extendUrlParamsOntoReq(route, path, req) {
        route.split('/').forEach((urlPart, i) => {
            if (urlPart[0] !== ':') return
            req.params[urlPart.substring(1)] = path.split('/')[i]
        })
    }

    /**
     *
     * @param {*} objA
     * @param {*} objB
     * @returns
     */
    _mergeParams(objA, objB) {
        if (!objB) return objA
        Object.keys(objA).forEach(someKey => {
            if (!objB[someKey]) {
                objB[someKey] = objA[someKey]
                return
            }

            const aString = typeof objA[someKey] === 'string'
            const bString = typeof objB[someKey] === 'string'
            if (aString || bString) {
                objB[someKey] = [ objA[someKey], objB[someKey] ]
                return
            }

            objB[someKey] = this._mergeParams(objA[someKey], objB[someKey])
        })
        return objB
    }
}

module.exports = rerouter