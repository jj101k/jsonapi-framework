"use strict"

const debug = require("./debugging")
const RetainsJsonApiPrivate = require("./RetainsJsonApiPrivate")

/**
 * @typedef {import("../types/Handler").JsonApiRequest} JsonApiRequest
 * @typedef {import("../types/postProcessing").paramTree} paramTree
 * @typedef {{method: import("../types/Handler").HttpVerbs, uri: string,
 * originalRequest: {headers: any, cookies: any}, params?: paramTree}} routeRequest
 * @typedef {{url: string, originalUrl: string, headers: any, cookies: any,
 * params: paramTree & {type: string}}} rerouteRequest
 * @typedef {{set(): void, status(httpCode: number), end(payload: any):
 * any, httpCode: number | undefined}} rerouteResponse
 */

/**
 *
 */
class rerouter extends RetainsJsonApiPrivate {
    /**
     *
     * @param {Iterable<[string, string]>} params
     * @returns {paramTree}
     */
    #expandParams(params) {
        /**
         * @type {paramTree}
         */
        const tree = {}
        for(const [key, value] of params) {
            const keyComponents = this.#expandParamPath(key)
            /**
             * @type {string}
             */
            const lastComponent = keyComponents.pop()

            /**
             * @type {paramTree | string}
             */
            let subTree = tree
            for(const subPath of keyComponents) {
                if(!subTree[subPath]) {
                    subTree[subPath] = {}
                }
                subTree = subTree[subPath]
            }

            if(subTree[lastComponent]) {
                if(typeof subTree[lastComponent] == "string") {
                    subTree[lastComponent] = [subTree[lastComponent]]
                }
                if(!Array.isArray(subTree[lastComponent])) {
                    throw new Error(`Contradictory param at ${key}`)
                }
                subTree[lastComponent].push(value)
            } else {
                subTree[lastComponent] = value
            }
        }
        return tree
    }

    /**
     * @param {string} path
     */
    #expandParamPath(path) {
        const md = path.match(/^([^\x5b]+)((?:\x5b[^\x5b\x5d]+\x5d)*)$/)
        if(!md) {
            throw new Error(`Unparseable param path: ${path}`)
        }
        const head = md[1]
        const tail = md[2]
        if(tail) {
            const parts = tail.slice(1, tail.length - 1).split("][")
            return [head, ...parts]
        } else {
            return [head]
        }
    }

    /**
     *
     * @param {routeRequest} newRequest
     */
    async route(newRequest) {
        const validRoutes = this.privateData.router._routes[newRequest.method.toLowerCase()]

        const path = this.#generateSanePath(newRequest)
        const route = this.#pickFirstMatchingRoute(validRoutes, path)
        if(!route) {
            throw new Error(`Unable to find route matching ${path}`)
        }
        const url = new URL(newRequest.uri, "https://localhost")

        /**
         * @type {rerouteRequest}
         */
        const req = {
            url: newRequest.uri,
            originalUrl: newRequest.originalRequest.originalUrl,
            headers: newRequest.originalRequest.headers,
            cookies: newRequest.originalRequest.cookies,
            params: this.#mergeParams(this.#expandParams(url.searchParams), newRequest.params)
        }
        this.#extendUrlParamsOntoReq(route, path, req)

        debug.reroute("Request", route, JSON.stringify(req))

        return new Promise((resolve, reject) => {
            /**
             * @type {rerouteResponse}
             */
            const res = {
                httpCode: undefined,
                set() { },
                status(httpCode) {
                    this.httpCode = httpCode
                    return res
                },
                end(payload) {
                    if (this.httpCode && this.httpCode >= 400) {
                        debug.reroute("Error", payload.toString())
                        return reject(JSON.parse(payload.toString()))
                    }
                    if (newRequest.method !== "GET") {
                        debug.reroute("Response", payload.toString())
                    }
                    const json = JSON.parse(payload.toString())
                    return resolve(json)
                }
            }
            /**
             * @type {Partial<JsonApiRequest>}
             */
            const modifiedRequest = {...newRequest.originalRequest}
            delete modifiedRequest.params
            delete modifiedRequest.route
            validRoutes[route](req, res, modifiedRequest)
        })
    }

    /**
     *
     * @param {routeRequest} newRequest
     * @returns
     */
    #generateSanePath(newRequest) {
        /**
         * @type {string}
         */
        let path = newRequest.uri.replace(/^https?:\/\/[^/]*/, "")
        if (this.jsonApi._apiConfig.base !== "/") {
            path = path.replace(/^([^/])/, "/$1")
            // This retains the exact original behaviour of stripping everything
            // before the first occurrence, regardless of where it is.
            const position = path.indexOf(this.jsonApi._apiConfig.base)
            if(position === -1) {
                path = "" // This is what it did originally.
            } else {
                path = path.substring(position + this.jsonApi._apiConfig.base.length)
            }
        }
        return path.replace(/^\//, "").replace(/[?].*/, "").replace(/\/$/, "")
    }

    /**
     *
     * @param {{[route: string]: any}} validRoutes
     * @param {string} path
     * @returns
     */
    #pickFirstMatchingRoute(validRoutes, path) {
        return Object.keys(validRoutes).reverse().find(
            someRoute => path.match(new RegExp(`^${someRoute.replace(/(:[a-z]+)/g, "[^/]*?")}$`))
        )
    }

    /**
     *
     * @param {string} route
     * @param {string} path
     * @param {rerouteRequest} req
     */
    #extendUrlParamsOntoReq(route, path, req) {
        const routeParts = route.split("/")
        const pathParts = path.split("/")
        for(const [i, urlPart] of Object.entries(routeParts)) {
            if(urlPart[0] == ":") {
                req.params[urlPart.substring(1)] = pathParts[i]
            }
        }
    }

    /**
     *
     * @param {paramTree} objA
     * @param {paramTree} objB
     * @returns
     */
    #mergeParams(objA, objB) {
        if (!objB) return objA
        for(const [someKey, valueA] of Object.entries(objA)) {
            if (!objB[someKey]) {
                objB[someKey] = valueA
                continue
            }

            const aString = typeof valueA === "string"
            const bString = typeof objB[someKey] === "string"
            if (aString || bString) {
                objB[someKey] = [valueA, objB[someKey]]
            } else {
                objB[someKey] = this.#mergeParams(valueA, objB[someKey])
            }
        }
        return objB
    }
}

module.exports = rerouter