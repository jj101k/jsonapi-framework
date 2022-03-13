'use strict'

const express = require('express')
let app
let server
const cookieParser = require('cookie-parser')
const debug = require('./debugging')
const url = require('url')
const metrics = require('./metrics')
const RetainsJsonApiPrivate = require('./RetainsJsonApiPrivate')

class routerClass extends RetainsJsonApiPrivate {
    /**
     *
     */
    _routes = { }

    /**
     *
     */
    applyMiddleware() {
        app = app || this.jsonApi._apiConfig.router || express()
        app.use((req, res, next) => {
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
            }

            return next()
        })

        app.use((req, res, next) => {
            if (!req.headers['content-type'] && !req.headers.accept) return next()

            if (req.headers['content-type']) {
                // 415 Unsupported Media Type
                if (req.headers['content-type'].match(/^application\/vnd\.api\+json;.+$/)) {
                    return res.status(415).end(`HTTP 415 Unsupported Media Type - [${req.headers['content-type']}]`)
                }

                // Convert "application/vnd.api+json" content type to "application/json".
                // This enables the express body parser to correctly parse the JSON payload.
                if (req.headers['content-type'].match(/^application\/vnd\.api\+json$/)) {
                    req.headers['content-type'] = 'application/json'
                }
            }

            if (req.headers.accept) {
                // 406 Not Acceptable
                let matchingTypes = req.headers.accept.split(/, ?/)
                matchingTypes = matchingTypes.filter(mediaType => // Accept application/*, */vnd.api+json, */* and the correct JSON:API type.
                    mediaType.match(/^(\*|application)\/(\*|json|vnd\.api\+json)$/) || mediaType.match(/\*\/\*/))

                if (matchingTypes.length === 0) {
                    return res.status(406).end()
                }
            }

            return next()
        })

        app.use(express.json(this.jsonApi._apiConfig.bodyParserJsonOpts))
        app.use(express.urlencoded({ extended: true }))
        app.use(cookieParser())
        if (!this.jsonApi._apiConfig.router) {
            app.disable('x-powered-by')
            app.disable('etag')
        }
        this.privateData.jsonApiGraphQL.with(app)

        let requestId = 0
        app.route('*').all((req, res, next) => {
            debug.requestCounter(requestId++, req.method, req.url)
            if (requestId > 1000) requestId = 0
            next()
        })
    }

    /**
     *
     * @param {*} port
     * @param {*} cb
     */
    listen(port, cb) {
        if (!server) {
            if (this.jsonApi._apiConfig.protocol === 'https') {
                server = require('https').createServer(this.jsonApi._apiConfig.tls || {}, app)
            } else {
                server = require('http').createServer(app)
            }
            server.listen(port, cb)
        }
    }

    /**
     *
     */
    close() {
        if (server) {
            server.close()
            server = null
        }
    }

    /**
     *
     * @param {*} config
     * @param {*} callback
     */
    bindRoute(config, callback) {
        const path = this.jsonApi._apiConfig.base + config.path
        const verb = config.verb.toLowerCase()

        const routeHandler = (req, res, extras) => {
            let request = this._getParams(req)
            request = Object.assign(request, extras)
            const resourceConfig = this.jsonApi._resources[request.params.type]
            request.resourceConfig = resourceConfig
            res._request = request
            res._startDate = new Date()
            this.authenticate(request, res, () => callback(request, resourceConfig, res))
        }
        this._routes[verb] = this._routes[verb] || { }
        this._routes[verb][config.path] = routeHandler
        app[verb](path, routeHandler)
    }

    /**
     *
     * @param {*} request
     * @param {*} res
     * @param {*} callback
     * @returns
     */
    authenticate(request, res, callback) {
        if (!this._authFunction) return callback()

        this._authFunction(request, err => {
            if (!err) return callback()

            const errorWrapper = {
                status: '401',
                code: 'UNAUTHORIZED',
                title: 'Authentication Failed',
                detail: err || 'You are not authorised to access this resource.'
            }
            const payload = this.privateData.responseHelper.generateError(request, errorWrapper)
            res.status(401).end(Buffer.from(JSON.stringify(payload)))
        })
    }

    /**
     *
     * @param {*} authFunction
     */
    authenticateWith(authFunction) {
        this._authFunction = authFunction
    }

    /**
     *
     * @param {*} callback
     */
    bind404(callback) {
        app.use((req, res) => {
            const request = this._getParams(req)
            return callback(request, res)
        })
    }

    /**
     *
     * @param {*} callback
     */
    bindErrorHandler(callback) {
        app.use((error, req, res, next) => {
            const request = this._getParams(req)
            return callback(request, res, error, next)
        })
    }

    /**
     *
     * @param {*} req
     * @returns
     */
    _getParams(req) {
        let urlParts = req.url.split(this.jsonApi._apiConfig.base)
        urlParts.shift()
        urlParts = urlParts.join(this.jsonApi._apiConfig.base).split('?')

        const headersToRemove = [
            'host', 'connection', 'accept-encoding', 'accept-language', 'content-length'
        ]

        let combined
        let reqUrl = req.url
        if (this.jsonApi._apiConfig.urlPrefixAlias) {
            combined = this.jsonApi._apiConfig.urlPrefixAlias.replace(/\/$/, '')
            reqUrl = reqUrl.replace(this.jsonApi._apiConfig.base, '/')
        } else {
            combined = url.format({
                protocol: this.jsonApi._apiConfig.protocol,
                hostname: this.jsonApi._apiConfig.hostname,
                port: this.jsonApi._apiConfig.port
            })
        }

        combined += reqUrl

        const safeHeaders = {...req.headers}
        for(const header of headersToRemove) {
            delete safeHeaders[header]
        }

        return {
            params: Object.assign(req.params, req.body, req.query),
            headers: req.headers,
            safeHeaders,
            cookies: req.cookies,
            originalUrl: req.originalUrl,
            // expose original express req and res objects in case customer handlers need them for any reason.
            // can be useful when custom handlers rely on custom and/or third party express middleware that
            // modifies/augments the express req or res (e.g. res.locals) for things like authentication, authorization,
            // data connection pool management, etc.
            express: { req, res: req.res },
            route: {
                verb: req.method,
                host: req.headers.host,
                base: this.jsonApi._apiConfig.base,
                path: urlParts.shift() || '',
                query: urlParts.shift() || '',
                combined
            }
        }
    }

    /**
     *
     * @param {*} res
     * @param {*} payload
     * @param {*} httpCode
     */
    sendResponse(res, payload, httpCode) {
        const timeDiff = (new Date()) - res._startDate
        metrics.processResponse(res._request, httpCode, payload, timeDiff)
        res.status(httpCode).end(Buffer.from(JSON.stringify(payload)))
    }

    /**
     *
     * @returns
     */
    getExpressServer() {
        app = app || this.jsonApi._apiConfig.router || express()
        return app
    }
}

module.exports = routerClass
