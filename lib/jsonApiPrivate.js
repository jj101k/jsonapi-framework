const router = require("./router")
const JsonApiGraphQL = require("./graphQl/JsonApiGraphQL")
const routesClass = require("./routes")
const responseHelperClass = require("./responseHelper")
const RetainsJsonApi = require("./RetainsJsonApi")

/**
 *
 */
class jsonApiPrivate extends RetainsJsonApi {
    /**
     * @type {JsonApiGraphQL}
     */
    jsonApiGraphQL

    /**
     *
     */
    responseHelper = new responseHelperClass()

    /**
     * @type {router}
     */
    router

    /**
     * @type {routesClass}
     */
    routes

    /**
     *
     * @param {*} jsonApi
     */
    constructor(jsonApi) {
        super(jsonApi)
        this.router = new router(jsonApi, this)
        this.routes = new routesClass(jsonApi, this)
        this.jsonApiGraphQL = new JsonApiGraphQL(jsonApi, this)
    }
}

module.exports = jsonApiPrivate