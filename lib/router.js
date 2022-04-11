'use strict'

const express = require('express')
const cookieParser = require('cookie-parser')
const debug = require('./debugging')
const metrics = require('./metrics')
const RetainsJsonApiPrivate = require('./RetainsJsonApiPrivate')

/**
 *
 */
class router extends RetainsJsonApiPrivate {
    /**
     * @type {express.Express | null}
     */
    static #persistentApp = null

    /**
     * @param {jsonApi} jsonApi
     */
    static #getApp(jsonApi) {
        if(!this.#persistentApp) {
            this.#persistentApp = jsonApi._apiConfig.router || express()
        }
        return this.#persistentApp
    }

    /**
     * @type {(request: Express.Request, f: (err: any) => any) => any | null}
     */
    #authFunction = null

    /**
     * @type {express.Express}
     */
    #expressApp

    /**
     * @type {express.Express}
     */
    #server = null

    /**
     *
     * @param {Express.Request} request
     * @param {Express.Response} res
     * @param {() => any} callback
     * @returns
     */
    #authenticate(request, res, callback) {
        if (!this.#authFunction) return callback()

        this.#authFunction(request, err => {
            if (!err) return callback()

            const payload = this.privateData.responseHelper.generateError(request, {
                status: '401',
                code: 'UNAUTHORIZED',
                title: 'Authentication Failed',
                detail: err || 'You are not authorised to access this resource.'
            })
            res.status(401).end(Buffer.from(JSON.stringify(payload)))
        })
    }

    /**
     *
     * @param {express.Request} req
     * @returns
     */
     #getParams(req) {
        const config = this.jsonApi._apiConfig

        const headersToRemove = [
            'host', 'connection', 'accept-encoding', 'accept-language', 'content-length'
        ]

        const prefixURL = new URL(
            this.jsonApi._apiConfig.urlPrefixAlias ||
            `${config.protocol}://${config.hostname}:${config.port}`
        )

        const url = new URL(req.url, prefixURL)
        // Compat
        url.protocol = prefixURL.protocol
        url.hostname = prefixURL.hostname
        url.port = prefixURL.port
        //

        return {
            params: {...req.params, ...req.body, ...req.query},
            headers: req.headers,
            safeHeaders: Object.fromEntries(
                Object.entries(req.headers).filter(([h]) => !headersToRemove.includes(h))
            ),
            cookies: req.cookies,
            originalUrl: req.originalUrl,
            // expose original express req and res objects in case customer handlers need them for any reason.
            // can be useful when custom handlers rely on custom and/or third party express middleware that
            // modifies/augments the express req or res (e.g. res.locals) for things like authentication, authorization,
            // data connection pool management, etc.
            express: {
                req,
                res: req.res,
            },
            route: {
                verb: req.method,
                host: req.headers.host,
                base: config.base,
                path: url.pathname.split(config.base).slice(1).join(config.base) || '',
                query: url.search.replace(/^[?]/, "") || '',
                combined: "" + url,
            },
        }
    }

    /**
     * @type {{[verb: string]: {[path: string]: (req: express.Request, res: express.Response, extras: Partial<ReturnType<router["#getParams"]>>) => void}}}}
     */
    _routes = { }

    /**
     *
     * @returns
     */
    get expressServer() {
        if(!this.#expressApp) {
            this.#expressApp = router.#getApp(this.jsonApi)
        }
        return this.#expressApp
    }

    /**
     *
     */
    applyMiddleware() {
        this.expressServer.use((req, res, next) => {
            res.set({
                'Content-Type': 'application/vnd.api+json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || '',
                'Cache-Control': 'private, must-revalidate, max-age=0',
                'Expires': 'Thu, 01 Jan 1970 00:00:00'
            })

            if (req.method === 'OPTIONS') {
                return res.status(204).end()
            } else {
                return next()
            }
        })

        this.expressServer.use((req, res, next) => {
            const contentType = req.headers['content-type']
            if (contentType) {
                // 415 Unsupported Media Type
                if (contentType.startsWith("application/vnd.api+json;")) {
                    return res.status(415).end(`HTTP 415 Unsupported Media Type - [${contentType}]`)
                } else if (contentType.startsWith("application/vnd.api+json")) {
                    // Convert "application/vnd.api+json" content type to "application/json".
                    // This enables the express body parser to correctly parse the JSON payload.
                    req.headers['content-type'] = 'application/json'
                }
            }

            if (req.headers.accept) {
                // 406 Not Acceptable
                const outputTypes = [
                    "application/vnd.api+json",
                    "application/json",
                    "application/*",
                    "*/vnd.api+json",
                    "*/json",
                    "*/*",
                ]
                if (!req.headers.accept.split(/, ?/).some(mediaType => outputTypes.includes(mediaType))) {
                    return res.status(406).end()
                }
            }

            return next()
        })

        this.expressServer.use(express.json(this.jsonApi._apiConfig.bodyParserJsonOpts))
        this.expressServer.use(express.urlencoded({ extended: true }))
        this.expressServer.use(cookieParser())
        if (!this.jsonApi._apiConfig.router) {
            this.expressServer.disable('x-powered-by')
            this.expressServer.disable('etag')
        }
        this.privateData.jsonApiGraphQL.with(this.expressServer)

        let requestId = 0
        this.expressServer.route('*').all((req, res, next) => {
            debug.requestCounter(requestId++, req.method, req.url)
            if (requestId > 1000) requestId = 0
            next()
        })
    }

    /**
     *
     * @param {number} port
     * @param {() => void} cb
     */
    listen(port, cb) {
        if (!this.#server) {
            if (this.jsonApi._apiConfig.protocol === 'https') {
                this.#server = require('https').createServer(this.jsonApi._apiConfig.tls || {}, this.expressServer)
            } else {
                this.#server = require('http').createServer(this.expressServer)
            }
            this.#server.listen(port, cb)
        }
    }

    /**
     *
     */
    close() {
        if (this.#server) {
            this.#server.close()
            this.#server = null
        }
    }

    /**
     *
     * @param {import("../types/Handler").JsonApiRequest["route"]} config
     * @param {(req: express.Request, rc: import("../types/jsonApi").ResourceConfig, res: express.Response) => any} callback
     */
    bindRoute(config, callback) {
        const path = this.jsonApi._apiConfig.base + config.path
        const verb = config.verb.toLowerCase()

        if(!this._routes[verb]) {
            this._routes[verb] = { }
        }
        this._routes[verb][config.path] = (req, res, extras) => {
            const request = {
                ...this.#getParams(req),
                ...extras,
            }
            const resourceConfig = this.jsonApi._resources[request.params.type]
            request.resourceConfig = resourceConfig
            res._request = request
            res._startDate = new Date()
            this.#authenticate(request, res, () => callback(request, resourceConfig, res))
        }
        this.expressServer[verb](path, this._routes[verb][config.path])
    }

    /**
     *
     * @param {(request: Express.Request, f: (err: any) => any) => any} authFunction
     */
    authenticateWith(authFunction) {
        this.#authFunction = authFunction
    }

    /**
     *
     * @param {(request: ReturnType<router["#getParams"]>, res: Express.Response) => any} callback
     */
    bind404(callback) {
        this.expressServer.use((req, res) => callback(this.#getParams(req), res))
    }

    /**
     *
     * @param {(request: ReturnType<router["#getParams"]>, res: Express.Response, error: any, next: Function) => any} callback
     */
    bindErrorHandler(callback) {
        this.expressServer.use((error, req, res, next) => callback(this.#getParams(req), res, error, next))
    }

    /**
     *
     * @param {express.Response & {_request: import("express").Request, _startDate: Date}} res
     * @param {*} payload
     * @param {number} httpCode
     */
    sendResponse(res, payload, httpCode) {
        const timeDiff = (new Date()) - res._startDate
        metrics.processResponse(res._request, httpCode, payload, timeDiff)
        res.status(httpCode).end(Buffer.from(JSON.stringify(payload)))
    }
}

module.exports = router
