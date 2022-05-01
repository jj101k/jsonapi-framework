const RetainsJsonApi = require("./RetainsJsonApi")

/**
 *
 */
class RetainsJsonApiPrivate extends RetainsJsonApi {
    /**
     * @type {import("./jsonApiPrivate")}
     */
    privateData

    /**
     *
     * @param {import("./jsonApi")} jsonApi
     * @param {import("./jsonApiPrivate")} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi)
        this.privateData = privateData
    }
}

module.exports = RetainsJsonApiPrivate