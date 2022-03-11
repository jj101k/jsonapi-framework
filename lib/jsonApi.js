'use strict'

const _ = {
    pick: require('lodash.pick')
}
const ourJoi = require('./ourJoi.js')
const router = require('./router.js')
const responseHelper = require('./responseHelper.js')
const handlerEnforcer = require('./handlerEnforcer.js')
const pagination = require('./pagination.js')
const routes = require('./routes')
const url = require('url')
const metrics = require('./metrics.js')
const schemaValidator = require('./schemaValidator.js')

module.exports = jsonApi

/**
 *
 */
class jsonApi {
    /**
     *
     */
    static _version = require(require('path').join(__dirname, '../package.json')).version

    /**
     *
     */
    static _resources = { }

    /**
     *
     */
    static _apiConfig = { }

    /**
     *
     */
    static Joi = ourJoi.Joi

    /**
     *
     */
    static metrics = metrics.emitter

    /**
     *
     */
    static MemoryHandler = require('./handlers/MemoryHandler')

    /**
     *
     */
    static ChainHandler = require('./handlers/ChainHandler')

    /**
     *
     * @param {*} apiConfig
     */
    static setConfig(apiConfig) {
        this._apiConfig = apiConfig
        this._apiConfig.base = this._cleanBaseUrl(this._apiConfig.base)
        this._apiConfig.pathPrefix = apiConfig.urlPrefixAlias || this._concatenateUrlPrefix(this._apiConfig)
        responseHelper.setBaseUrl(this._apiConfig.pathPrefix)
        responseHelper.setMetadata(this._apiConfig.meta)
    }

    /**
     *
     */
    static authenticate = router.authenticateWith

    /**
     *
     * @param {*} config
     * @returns
     */
    static _concatenateUrlPrefix(config) {
        return url.format({
            protocol: config.protocol,
            hostname: config.hostname,
            port: config.port,
            pathname: config.base
        })
    }

    /**
     *
     * @param {*} base
     * @returns
     */
    static _cleanBaseUrl(base) {
        if (!base) {
            base = ''
        }
        if (base[0] !== '/') {
            base = `/${base}`
        }
        if (base[base.length - 1] !== '/') {
            base += '/'
        }
        return base
    }

    /**
     *
     * @param {*} resourceConfig
     */
    static define(resourceConfig) {
        if (!resourceConfig.resource.match(/^[A-Za-z0-9_]*$/)) {
            throw new Error(`Resource '${resourceConfig.resource}' contains illegal characters!`)
        }
        resourceConfig.namespace = resourceConfig.namespace || 'default'
        resourceConfig.searchParams = resourceConfig.searchParams || { }
        resourceConfig.actions = resourceConfig.actions || {}
        this._resources[resourceConfig.resource] = resourceConfig

        handlerEnforcer.wrap(resourceConfig.handlers)

        resourceConfig.handlers.initialise = resourceConfig.handlers.initialise || resourceConfig.handlers.initialize
        if (resourceConfig.handlers.initialise) {
            resourceConfig.handlers.initialise(resourceConfig)
        }

        Object.keys(resourceConfig.attributes).forEach(attribute => {
            if (!attribute.match(/^[A-Za-z0-9_]*$/)) {
                throw new Error(`Attribute '${attribute}' on ${resourceConfig.resource} contains illegal characters!`)
            }
        })
        Object.keys(resourceConfig.actions).forEach(action => {
            if (!action.match(/^[A-Za-z0-9_]*$/)) {
                throw new Error(`Attribute '${action}' on ${resourceConfig.resource} contains illegal characters!`)
            }
        })

        resourceConfig.searchParams = {
            type: ourJoi.Joi.any().required().valid(resourceConfig.resource)
                .description(`Always "${resourceConfig.resource}"`)
                .example(resourceConfig.resource),
            sort: ourJoi.Joi.any()
                .description('An attribute to sort by')
                .example('title'),
            filter: ourJoi.Joi.any()
                .description('An attribute+value to filter by')
                .example('title'),
            fields: ourJoi.Joi.any()
                .description('An attribute+value to filter by')
                .example('title'),
            include: ourJoi.Joi.any()
                .description('An attribute to include')
                .example('title'),
            ...(resourceConfig.searchParams || {}),
            ...(pagination.joiPageDefinition || {}),
        }

        resourceConfig.attributes = {
            id: ourJoi.Joi.string().required()
                .description('Unique resource identifier')
                .example('1234'),
            type: ourJoi.Joi.string().required().valid(resourceConfig.resource)
                .description(`Always "${resourceConfig.resource}"`)
                .example(resourceConfig.resource),
            meta: ourJoi.Joi.object().optional(),
            ...(resourceConfig.attributes || {}),
        }

        resourceConfig.onCreate = _.pick.apply(_, [].concat(resourceConfig.attributes, Object.keys(resourceConfig.attributes).filter(i => (resourceConfig.attributes[i]._meta.indexOf('readonly') === -1) && (!(resourceConfig.attributes[i]._settings || { }).__as))))
    }

    /**
     *
     * @param {*} errHandler
     */
    static onUncaughtException(errHandler) {
        this._errHandler = errHandler
    }

    /**
     *
     * @returns
     */
    getExpressServer() {
        return router.getExpressServer()
    }

    /**
     *
     * @param {*} cb
     */
    static start(cb) {
        schemaValidator.validate(this._resources)
        router.applyMiddleware()
        routes.register()
        if (!this._apiConfig.router) {
            router.listen(this._apiConfig.port, cb)
        }
    }

    /**
     *
     */
    static close() {
        router.close()
        metrics.emitter.removeAllListeners('data')
        for (const i in this._resources) {
            const resourceConfig = this._resources[i]
            if (resourceConfig.handlers.close) resourceConfig.handlers.close()
        }
    }
}