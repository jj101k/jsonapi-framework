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
     * @param {string} routeString
     * @returns
     */
    static #replaceUUIDsInRoute(routeString) {
        return routeString.replace(/[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}/ig, ':id')
    }

    /**
     *
     * @param {string} routeString
     * @returns
     */
    static #replaceTrailingSlashesInRoute(routeString) {
        return routeString.replace(new RegExp("/$"), '')
    }

    /**
     *
     * @param {import("express").Request} request
     * @param {number} httpCode
     * @param {{errors?: {title: string}[]}} payload
     * @param {number} duration
     */
    static processResponse(request, httpCode, payload, duration) {
        const route = this.#replaceTrailingSlashesInRoute(
            this.#replaceUUIDsInRoute(request ? request.route.path : 'invalid')
        )

        this.emitter.emit('data', {
            route,
            verb: request ? request.route.verb || 'GET' : 'GET',
            httpCode,
            error: payload.errors ? payload.errors[0].title : null,
            duration: duration || 0,
        })
    }
}

module.exports = metrics