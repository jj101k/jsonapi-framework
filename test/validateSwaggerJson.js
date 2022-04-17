const jsonApiTestServer = require("../example/server")
const request = require("request")
const assert = require("assert")

describe("Use a tool to validate the generated swagger document", () => {
    it("should not contain any errors", done => {
        const validator = require("@apidevtools/swagger-parser")

        const uri = "http://localhost:16006/rest/swagger.json"
        request(uri, (meh, res, swaggerObject) => {
            swaggerObject = JSON.parse(swaggerObject)

            validator.validate(swaggerObject, (err, result) => {
                assert.ifError(err)

                console.log("Swagger document is valid")
                done()
            })
        })
    })

    before(() => {
        jsonApiTestServer.start()
    })
    after(() => {
        jsonApiTestServer.close()
    })
})
