'use strict'

const ourJoi = require('./ourJoi')
const handlerEnforcer = require('./handlerEnforcer')
const pagination = require('./pagination')
const metrics = require('./metrics')
const schemaValidator = require('./schemaValidator')
const jsonApiPrivate = require('./jsonApiPrivate')

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
    static Joi = ourJoi.Joi

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
     * @param {*} config
     * @param {string} base
     *
     * @returns
     */
    static _concatenateUrlPrefix(config, base) {
        const url = new URL(`${config.protocol}:${config.hostname}`)
        url.port = config.port
        url.pathname = base
        return "" + url
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
     */
    #privateData = new jsonApiPrivate(this)

    /**
     *
     * @returns
     */
    getExpressServer() {
        return this.#privateData.router.getExpressServer()
    }

    /**
     *
     */
    _resources = { }

     /**
      *
      */
    _apiConfig = { }

    /**
     *
     */
    metrics = metrics.emitter

    /**
     *
     */
    get authenticate() {
        return this.#privateData.router.authenticateWith.bind(this.#privateData.router)
    }

    /**
     *
     * @param {*} apiConfig
     */
    setConfig(apiConfig) {
        // Compat: retain it
        for(const k in this._apiConfig) {
            delete this._apiConfig[k]
        }
        const base = jsonApi._cleanBaseUrl(apiConfig.base)
        Object.assign(this._apiConfig, {
            ...apiConfig,
            base,
            pathPrefix: apiConfig.urlPrefixAlias || jsonApi._concatenateUrlPrefix(apiConfig, base),
        })
        this.#privateData.responseHelper.setBaseUrl(this._apiConfig.pathPrefix)
        this.#privateData.responseHelper.setMetadata(this._apiConfig.meta)
    }

    /**
     *
     * @param {*} resourceConfig
     */
    define(resourceConfig) {
        if (!resourceConfig.resource.match(/^[A-Za-z0-9_]*$/)) {
            throw new Error(`Resource '${resourceConfig.resource}' contains illegal characters!`)
        }
        for(const attribute of Object.keys(resourceConfig.attributes)) {
            if (!attribute.match(/^[A-Za-z0-9_]*$/)) {
                throw new Error(`Attribute '${attribute}' on ${resourceConfig.resource} contains illegal characters!`)
            }
        }
        for(const action of Object.keys(resourceConfig.actions || {})) {
            if (!action.match(/^[A-Za-z0-9_]*$/)) {
                throw new Error(`Attribute '${action}' on ${resourceConfig.resource} contains illegal characters!`)
            }
        }

        const attributes = {
            id: ourJoi.Joi.string().required()
                .description('Unique resource identifier')
                .example('1234'),
            type: ourJoi.Joi.string().required().valid(resourceConfig.resource)
                .description(`Always "${resourceConfig.resource}"`)
                .example(resourceConfig.resource),
            meta: ourJoi.Joi.object().optional(),
            ...(resourceConfig.attributes || {}),
        }

        const newResourceConfig = {
            ...resourceConfig,
            actions: resourceConfig.actions || {},
            attributes,
            handlers: {
                ...handlerEnforcer.wrapped(resourceConfig.handlers),
                initialise: resourceConfig.handlers.initialise || resourceConfig.handlers.initialize,
            },
            namespace: resourceConfig.namespace || 'default',
            onCreate: Object.fromEntries(
                Object.entries(attributes).filter(
                    ([k, v]) => !v._meta.includes("readonly") && !v._settings?.__as
                )
            ),
            searchParams: {
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
            },
        }

        this._resources[resourceConfig.resource] = newResourceConfig

        if (newResourceConfig.handlers.initialise) {
            newResourceConfig.handlers.initialise(resourceConfig)
        }
    }

    /**
     *
     * @param {*} errHandler
     */
    onUncaughtException(errHandler) {
        this._errHandler = errHandler
    }

    /**
     *
     * @param {*} cb
     */
    start(cb) {
        schemaValidator.validate(this._resources)
        this.#privateData.router.applyMiddleware()
        this.#privateData.routes.register()
        if (!this._apiConfig.router) {
            this.#privateData.router.listen(this._apiConfig.port, cb)
        }
    }

    /**
     *
     */
    close() {
        this.#privateData.router.close()
        metrics.emitter.removeAllListeners('data')
        for (const i in this._resources) {
            const resourceConfig = this._resources[i]
            if (resourceConfig.handlers.close) resourceConfig.handlers.close()
        }
    }
}

module.exports = jsonApi