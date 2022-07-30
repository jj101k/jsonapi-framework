"use strict"

const debug = require("./debugging")
const RerouteRequest = require("./RerouteRequest")
const RetainsJsonApiPrivate = require("./RetainsJsonApiPrivate")

/**
 * @typedef {import("../types/Handler").JsonApiRequest} JsonApiRequest
 * @typedef {import("../types/postProcessing").paramTree} paramTree
 * @typedef {{method: import("../types/Handler").HttpVerbs, uri: string,
 * originalRequest: {headers: any, cookies: any, originalUrl: string},
 * params?: paramTree}} routeRequest
 * @typedef {{set(): void, status(httpCode: number), end(payload: any):
 * any, httpCode: number | undefined}} rerouteResponse
 */

/**
 *
 */
class rerouter extends RetainsJsonApiPrivate {
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

        const req = new RerouteRequest(newRequest)
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
     * @param {RerouteRequest} req
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
}

module.exports = rerouter