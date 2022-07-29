"use strict"

const JsonApi = require("./jsonApi")

const jsonApi = new JsonApi()

module.exports = {
    /**
     *
     */
    authenticate: jsonApi.authenticate,
    /**
     *
     */
    ChainHandler: JsonApi.ChainHandler,
    /**
     *
     */
    close: jsonApi.close.bind(jsonApi),
    /**
     *
     */
    define: jsonApi.define.bind(jsonApi),
    /**
     *
     */
    getExpressServer() {
        return jsonApi.expressServer
    },
    /**
     *
     */
    Joi: JsonApi.Joi,
    /**
     *
     */
    MemoryHandler: JsonApi.MemoryHandler,
    /**
     *
     */
    metrics: jsonApi.metrics,
    /**
     *
     */
    onUncaughtException: jsonApi.onUncaughtException.bind(jsonApi),
    /**
     *
     */
    setConfig: jsonApi.setConfig.bind(jsonApi),
    /**
     *
     */
    start: jsonApi.start.bind(jsonApi),

    /**
     *
     */
    _apiConfig: jsonApi._apiConfig,
    /**
     *
     */
    _resources: jsonApi._resources,
}