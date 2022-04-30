const jsonApiTestServer = require("../example/server")
const request = require("request")
const assert = require("assert")
const {OpenApiValidator} = require("openapi-data-validator")

describe("Use a tool to validate the generated swagger document", () => {
    it("should not contain any errors", done => {
        const uri = "http://localhost:16006/rest/swagger.json"
        request(uri, async (meh, res, swaggerObject) => {
            swaggerObject = JSON.parse(swaggerObject)
            const openApiValidator = new OpenApiValidator({apiSpec: swaggerObject})
            const validator = openApiValidator.createValidator()

            try {
                await validator(swaggerObject)
                console.log("Swagger document is valid")
            } catch(err) {
                assert.ifError(err)
            }
            done()
        })
    })

    before(() => {
        jsonApiTestServer.start()
    })
    after(() => {
        jsonApiTestServer.close()
    })
})
