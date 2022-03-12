'use strict'
const EventEmitter = require('events').EventEmitter

/**
 *
 */
class metrics {
    /**
     *
     */
    static emitter = new EventEmitter()

    /**
     *
     * @param {*} routeString
     * @returns
     */
    static _replaceUUIDsInRoute(routeString) {
        return routeString.replace(/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/ig, ':id')
    }

    /**
     *
     * @param {*} routeString
     * @returns
     */
    static _replaceTrailingSlashesInRoute(routeString) {
        return routeString.replace(/\/$/, '')
    }

    /**
     *
     * @param {*} request
     * @param {*} httpCode
     * @param {*} payload
     * @param {*} duration
     */
    static processResponse(request, httpCode, payload, duration) {
        let route = request ? request.route.path : 'invalid'
        route = this._replaceUUIDsInRoute(route)
        route = this._replaceTrailingSlashesInRoute(route)

        this.emitter.emit('data', {
            route,
            verb: request ? request.route.verb || 'GET' : 'GET',
            httpCode,
            error: payload.errors ? payload.errors[0].title : null,
            duration: duration || 0
        })
    }
}

module.exports = metrics