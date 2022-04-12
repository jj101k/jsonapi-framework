"use strict"

const Joi = require("joi")
const JoiDateExtensions = require("joi-date-extensions")
Joi.extend(JoiDateExtensions)

/**
 *
 */
class ourJoi {
    /**
     *
     */
    static Joi = Joi

    /**
     *
     * @param {string} resourceName
     * @returns
     */
    static _joiBase(resourceName) {
        return Joi.object().keys({
            id: Joi.string().required(),
            type: Joi.any().required().valid(resourceName),
            meta: Joi.object().optional()
        })
    }
}

/**
 *
 * @param  {...any} resources
 * @returns
 */
Joi.one = function(...resources) {
    for(const resource of resources) {
        if (typeof resource !== "string") {
            throw new Error("Expected a string when defining a primary relation via .one()")
        }
    }
    const obj = Joi.alternatives().try([
        Joi.any().valid(null), // null
        ...resources.map(ourJoi._joiBase)
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
}
/**
 *
 * @param  {...any} resources
 * @returns
 */
Joi.many = function(...resources) {
    for(const resource of resources) {
        if (typeof resource !== "string") throw new Error("Expected a string when defining a primary relation via .many()")
    }
    const obj = Joi.array().items(resources.map(ourJoi._joiBase))
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
}
/**
 *
 * @param {{as: any, resource: any}} config
 */
Joi._validateForeignRelation = config => {
    if (!config.as) throw new Error("Missing 'as' property when defining a foreign relation")
    if (!config.resource) throw new Error("Missing 'resource' property when defining a foreign relation")
}
/**
 *
 * @param {{as: any, resource: any}} config
 * @returns
 */
Joi.belongsToOne = config => {
    Joi._validateForeignRelation(config)
    const obj = Joi.alternatives().try(
        Joi.any().valid(null), // null
        ourJoi._joiBase(config.resource)
    )
    obj._settings = {
        __one: [config.resource],
        __as: config.as
    }
    return obj
}
/**
 *
 * @param {{as: any, resource: any}} config
 * @returns
 */
Joi.belongsToMany = config => {
    Joi._validateForeignRelation(config)
    const obj = Joi.array().items(ourJoi._joiBase(config.resource))
    obj._settings = {
        __many: [config.resource],
        __as: config.as
    }
    return obj
}
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
Joi.action = config => {
    if (!(config.get && typeof config.get === "function")) {
        throw new Error("'get' has to be a function")
    }
    if (!(config.post && typeof config.post === "function")) {
        throw new Error("'post' has to be a function")
    }
    const obj = Joi.func()
    obj._settings = {
        _action: config
    }
    return obj
}

module.exports = ourJoi