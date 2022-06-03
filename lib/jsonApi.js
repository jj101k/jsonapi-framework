"use strict"

const OurJoi = require("./OurJoi")
const handlerEnforcer = require("./handlerEnforcer")
const pagination = require("./pagination")
const metrics = require("./metrics")
const schemaValidator = require("./schemaValidator")
const jsonApiPrivate = require("./jsonApiPrivate")
const SchemaHelper = require("./SchemaHelper")

/**
 *
 */
class jsonApi {
    /**
     *
     */
    static #version = require(require("path").join(__dirname, "../package.json")).version

    /**
     *
     */
    static Joi = OurJoi

    /**
     *
     */
    static MemoryHandler = require("./handlers/MemoryHandler")

    /**
     *
     */
    static ChainHandler = require("./handlers/ChainHandler")

    /**
     *
     * @param {{port?: number, protocol: string, hostname: string}} config
     * @param {string} base
     *
     * @returns
     */
    static #concatenateUrlPrefix(config, base) {
        const url = new URL(`${config.protocol}:${config.hostname}`)
        url.port = "" + config.port
        url.pathname = base
        return "" + url
    }

    /**
     *
     * @param {string | null} base
     * @returns
     */
    static #cleanBaseUrl(base) {
        return base?.replace(/^(?=[^/])/, "/")?.replace(/(?<=[^/])$/, "/") || "/"
    }

    /**
     *
     */
    #privateData = new jsonApiPrivate(this)

    /**
     * @type {(request, error) => any | undefined}
     */
    _errHandler

    /**
     * @type {{[resource: string]: import("../types/jsonApi").ResourceConfig}}
     */
    _resources = { }

    /**
     * @type {Partial<import("../types/jsonApi").ApiConfig>}
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
     */
    get expressServer() {
        return this.#privateData.router.expressServer
    }

    /**
     *
     * @param {import("../types/jsonApi").ApiConfig} apiConfig
     */
    setConfig(apiConfig) {
        // Compat: retain it
        for(const k in this._apiConfig) {
            delete this._apiConfig[k]
        }
        const base = jsonApi.#cleanBaseUrl(apiConfig.base)
        Object.assign(this._apiConfig, {
            ...apiConfig,
            base,
            pathPrefix: apiConfig.urlPrefixAlias || jsonApi.#concatenateUrlPrefix(apiConfig, base),
        })
        this.#privateData.responseHelper.setBaseUrl(this._apiConfig.pathPrefix)
        this.#privateData.responseHelper.setMetadata(this._apiConfig.meta)
    }

    /**
     *
     * @param {import("../types/jsonApi").ResourceConfig} resourceConfig
     */
    define(resourceConfig) {
        /**
         *
         * @param {string} type
         * @param {string} n
         * @throws
         */
        const assertValid = (type, n) => {
            if (!n.match(/^[A-Za-z0-9_]*$/)) {
                throw new Error(`${type} '${n}' contains illegal characters!`)
            }
        }
        assertValid("Resource", resourceConfig.resource)
        for(const attribute of Object.keys(resourceConfig.attributes)) {
            assertValid("Attribute", attribute)
        }
        for(const action of Object.keys(resourceConfig.actions || {})) {
            assertValid("Attribute", action)
        }

        /**
         * @type {import("../types/ResourceConfig").ResourceAttributes<any>}
         */
        const attributes = {
            id: jsonApi.Joi.string().required()
                .description("Unique resource identifier")
                .example("1234"),
            type: jsonApi.Joi.string().required().valid(resourceConfig.resource)
                .description(`Always "${resourceConfig.resource}"`)
                .example(resourceConfig.resource),
            meta: jsonApi.Joi.object().optional(),
            ...(resourceConfig.attributes || {}),
        }

        const initialise = ("initialise" in resourceConfig.handlers) ?
            resourceConfig.handlers.initialise :
            resourceConfig.handlers.initialize

        this._resources[resourceConfig.resource] = {
            ...resourceConfig,
            actions: resourceConfig.actions || {},
            attributes,
            handlers: {
                ...handlerEnforcer.wrapped(resourceConfig.handlers),
                initialise,
            },
            namespace: resourceConfig.namespace || "default",
            onCreate: Object.fromEntries(
                Object.entries(attributes).filter(
                    ([k, v]) => !v._meta.includes("readonly") && !SchemaHelper.isBelongsToRelationship(v)
                )
            ),
            searchParams: {
                type: jsonApi.Joi.any().required().valid(resourceConfig.resource)
                    .description(`Always "${resourceConfig.resource}"`)
                    .example(resourceConfig.resource),
                sort: jsonApi.Joi.any()
                    .description("An attribute to sort by")
                    .example("title"),
                filter: jsonApi.Joi.any()
                    .description("An attribute+value to filter by")
                    .example("title"),
                fields: jsonApi.Joi.any()
                    .description("An attribute+value to filter by")
                    .example("title"),
                include: jsonApi.Joi.any()
                    .description("An attribute to include")
                    .example("title"),
                ...(resourceConfig.searchParams || {}),
                ...(pagination.joiPageDefinition || {}),
            },
        }

        if (initialise) {
            initialise.call(this._resources[resourceConfig.resource].handlers, resourceConfig)
        }
    }

    /**
     *
     * @param {(request, error) => any | undefined} errHandler
     */
    onUncaughtException(errHandler) {
        this._errHandler = errHandler
    }

    /**
     *
     * @param {() => void} cb
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
        this.metrics.removeAllListeners("data")
        for (const resourceConfig of Object.values(this._resources)) {
            if (resourceConfig.handlers.close) {
                resourceConfig.handlers.close()
            }
        }
    }
}

module.exports = jsonApi