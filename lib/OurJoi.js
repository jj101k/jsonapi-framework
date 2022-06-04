"use strict"

const Joi = require("joi")
const JoiDateExtensions = require("joi-date-extensions")

const _OurJoi = Joi.extend(
    {
        type: "apiEntity",
        base: Joi.object(),

        /**
         *
         * @param {Joi.ObjectSchema} schema
         * @param  {string} resourceName
         * @returns
         */
        args(schema, resourceName) {
            return schema.keys({
                id: Joi.string().required(),
                type: Joi.any().required().valid(resourceName),
                meta: Joi.object().optional()
            })
        },
    }
)

const OurJoi = _OurJoi.extend(
    {
        type: "action",
        base: Joi.object(),
        flags: {
            action: {}
        },

        /**
         *
         * @param {Joi.FunctionSchema} schema
         * @param {{get?: () => any, post?: () => any, params: {[key: string]: import("joi").Schema}}} config
         * @returns
         */
        args(schema, config) {
            if (!(config.get && typeof config.get === "function")) {
                throw new Error("'get' has to be a function")
            }
            if (!(config.post && typeof config.post === "function")) {
                throw new Error("'post' has to be a function")
            }

            schema.$_setFlag("action", config, {clone: false})
            return schema.append(config.params)
        },
    },
    {
        type: "many",
        base: Joi.array(),
        flags: {
            many: {},
            uidType: {default: "string"},
        },

        /**
         *
         * @param {Joi.ArraySchema} schema
         * @param  {...string} resources
         * @returns
         */
        args(schema, ...resources) {
            for(const resource of resources) {
                if (typeof resource !== "string") throw new Error("Expected a string when defining a primary relation via .many()")
            }
            schema.$_setFlag("many", resources, {clone: false})
            return schema.items(...resources.map(r => _OurJoi.apiEntity(r)))
        },
        rules: {
            uidType: {
                method(keyType) {
                    return this.$_setFlag("uidType", keyType)
                },
                args: [
                    {
                        name: "keyType",
                        assert(keyType) {
                            return keyType == "uuid" || keyType == "autoincrement"
                        },
                        message: "Resources can be related only via UUID or AUTOINCREMENT keys",
                    }
                ]
            }
        },
    },
    {
        type: "one",
        base: Joi.alternatives(),
        flags: {
            one: {},
            uidType: {default: "string"},
        },

        /**
         *
         * @param {Joi.AlternativesSchema} schema
         * @param  {...string} resources
         * @returns
         */
        args(schema, ...resources) {
            for(const resource of resources) {
                if (typeof resource !== "string") throw new Error("Expected a string when defining a primary relation via .many()")
            }
            schema.$_setFlag("one", resources, {clone: false})
            return schema.try(
                Joi.any().valid(null), // null
                ...resources.map(r => OurJoi.apiEntity(r))
            )
        },
        rules: {
            uidType: {
                method(keyType) {
                    return this.$_setFlag("uidType", keyType)
                },
                args: [
                    {
                        name: "keyType",
                        assert(keyType) {
                            return keyType == "uuid" || keyType == "autoincrement"
                        },
                        message: "Resources can be related only via UUID or AUTOINCREMENT keys",
                    }
                ]
            }
        },
    },
    {
        type: "belongsToOne",
        base: Joi.alternatives(),
        flags: {
            many: {},
            as: {},
        },

        /**
         *
         * @param {Joi.AlternativesSchema} schema
         * @param  {{as: any, resource: any}} config
         * @returns
         */
        args(schema, config) {
            if (!config.as) throw new Error("Missing 'as' property when defining a foreign relation")
            if (!config.resource) throw new Error("Missing 'resource' property when defining a foreign relation")

            schema.$_setFlag("one", [config.resource], {clone: false})
            schema.$_setFlag("as", config.as, {clone: false})

            return schema.try(
                Joi.any().valid(null), // null
                OurJoi.apiEntity(config.resource)
            )
        }
    },
    {
        type: "belongsToMany",
        base: Joi.array(),
        flags: {
            many: {},
            as: {},
        },

        /**
         *
         * @param {Joi.ArraySchema} schema
         * @param  {{as: any, resource: any}} config
         * @returns
         */
        args(schema, config) {
            if (!config.as) throw new Error("Missing 'as' property when defining a foreign relation")
            if (!config.resource) throw new Error("Missing 'resource' property when defining a foreign relation")

            schema.$_setFlag("many", [config.resource], {clone: false})
            schema.$_setFlag("as", config.as, {clone: false})

            return schema.items(OurJoi.apiEntity(config.resource))
        }
    }
)

module.exports = OurJoi