const Router = require("./router")
const JsonApiGraphQL = require("./graphQl/JsonApiGraphQL")
const Routes = require("./Routes")
const ResponseHelper = require("./responseHelper")
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
    responseHelper = new ResponseHelper()

    /**
     * @type {Router}
     */
    router

    /**
     * @type {Routes}
     */
    routes

    /**
     *
     * @param {*} jsonApi
     */
    constructor(jsonApi) {
        super(jsonApi)
        this.router = new Router(jsonApi, this)
        this.routes = new Routes(jsonApi, this)
        this.jsonApiGraphQL = new JsonApiGraphQL(jsonApi, this)
    }
}

module.exports = jsonApiPrivate