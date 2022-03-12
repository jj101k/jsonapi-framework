'use strict'

const jsonApiClass = require("./jsonApi")

const jsonApi = new jsonApiClass()

module.exports = {
    authenticate: jsonApi.authenticate,
    ChainHandler: jsonApiClass.ChainHandler,
    close: jsonApi.close.bind(jsonApi),
    define: jsonApi.define.bind(jsonApi),
    getExpressServer: jsonApi.getExpressServer.bind(jsonApi),
    Joi: jsonApiClass.Joi,
    MemoryHandler: jsonApiClass.MemoryHandler,
    metrics: jsonApi.metrics,
    onUncaughtException: jsonApi.onUncaughtException.bind(jsonApi),
    setConfig: jsonApi.setConfig.bind(jsonApi),
    start: jsonApi.start.bind(jsonApi),

    _apiConfig: jsonApi._apiConfig,
    _resources: jsonApi._resources,
}