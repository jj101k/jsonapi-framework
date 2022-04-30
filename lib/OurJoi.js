"use strict"

const Joi = require("joi")
const JoiDateExtensions = require("joi-date-extensions")

const OurJoi = {
    ...Joi,
    /**
     *
     * @param {string} resourceName
     * @returns
     */
    _joiBase(resourceName) {
        return Joi.object().keys({
            id: Joi.string().required(),
            type: Joi.any().required().valid(resourceName),
            meta: Joi.object().optional()
        })
    },
    /**
     *
     * @param {{as: any, resource: any}} config
     */
    _validateForeignRelation(config) {
        if (!config.as) throw new Error("Missing 'as' property when defining a foreign relation")
        if (!config.resource) throw new Error("Missing 'resource' property when defining a foreign relation")
    },
    /**
     * Send a config of the format -
     * <pre>
     *     {
     *        params: {username: jsonApi.Joi.string(), password: jsonApi.Joi.string()},
     *        get () {},
     *        post () {}
     *     }
     * </pre>
     *
     * @param {{get?: () => any, post?: () => any}} config
     */
    action(config) {
        if (!(config.get && typeof config.get === "function")) {
            throw new Error("'get' has to be a function")
        }
        if (!(config.post && typeof config.post === "function")) {
            throw new Error("'post' has to be a function")
        }
        /**
         * @type {import("../types/ResourceConfig").Schema}
         */
        const obj = this.func()
        obj._settings = {
            _action: config
        }
        return obj
    },
    /**
     *
     * @param {{as: any, resource: any}} config
     * @returns
     */
    belongsToMany(config) {
        this._validateForeignRelation(config)
        /**
         * @type {import("../types/ResourceConfig").Schema}
         */
        const obj = this.array().items(this._joiBase(config.resource))
        obj._settings = {
            __many: [config.resource],
            __as: config.as
        }
        return obj
    },
    /**
     *
     * @param {{as: any, resource: any}} config
     * @returns
     */
    belongsToOne(config) {
        this._validateForeignRelation(config)
        /**
         * @type {import("../types/ResourceConfig").Schema}
         */
        const obj = this.alternatives().try(
            this.any().valid(null), // null
            this._joiBase(config.resource)
        )
        obj._settings = {
            __one: [config.resource],
            __as: config.as
        }
        return obj
    },
    /**
     *
     * @param  {...any} resources
     * @returns
     */
    many(...resources) {
        for(const resource of resources) {
            if (typeof resource !== "string") throw new Error("Expected a string when defining a primary relation via .many()")
        }
        /**
         * @type {import("../types/ResourceConfig").Schema}
         */
        const obj = this.array().items(resources.map(this._joiBase))
        obj._settings = {
            __many: resources,
            _uidType: "string",
        }
        /**
         *
         * @param {string} keyType
         * @returns
         */
        obj.uidType = function(keyType) {
            if (keyType !== "uuid" && keyType !== "autoincrement") {
                throw new Error("Resources can be related only via UUID or AUTOINCREMENT keys")
            }
            this._settings._uidType = keyType
            return this
        }
        return obj
    },
    /**
     *
     * @param  {...any} resources
     * @returns
     */
    one(...resources) {
        for(const resource of resources) {
            if (typeof resource !== "string") {
                throw new Error("Expected a string when defining a primary relation via .one()")
            }
        }
        /**
         * @type {import("../types/ResourceConfig").Schema}
         */
        const obj = this.alternatives().try([
            this.any().valid(null), // null
            ...resources.map(this._joiBase)
        ])
        obj._settings = {
            __one: resources,
            _uidType: "string",
        }
        /**
         *
         * @param {string} keyType
         * @returns
         */
        obj.uidType = function(keyType) {
            if (keyType !== "uuid" && keyType !== "autoincrement") {
                throw new Error("Resources can be related only via UUID or AUTOINCREMENT keys")
            }
            this._settings._uidType = keyType
            return this
        }
        return obj
    },
}

OurJoi.extend(JoiDateExtensions)

module.exports = OurJoi