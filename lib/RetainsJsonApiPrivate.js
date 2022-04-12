const RetainsJsonApi = require("./RetainsJsonApi")

/**
 *
 */
class RetainsJsonApiPrivate extends RetainsJsonApi {
    /**
     * @type {jsonApiPrivate}
     */
    privateData

    /**
     *
     * @param {jsonApiClass} jsonApi
     * @param {jsonApiPrivate} privateData
     */
    constructor(jsonApi, privateData) {
        super(jsonApi)
        this.privateData = privateData
    }
}

module.exports = RetainsJsonApiPrivate