"use strict"

const request = require("request")
const assert = require("assert")
const jsonApiTestServer = require("../example/server")
const helpers = require("./helpers")

describe("Testing jsonapi-server", () => {
    describe("authentication", () => {
        it("blocks access with the blockMe header", done => {
            const data = {
                method: "get",
                url: "http://localhost:16006/rest/articles",
                headers: {
                    blockMe: "please"
                }
            }
            request(data, (err, res, json) => {
                assert.strictEqual(err, null)
                assert.strictEqual(res.statusCode, 401, "Expecting 401")
                helpers.validateError(json)
                done()
            })
        })

        it("blocks access with the blockMe cookies", done => {
            const data = {
                method: "get",
                url: "http://localhost:16006/rest/articles",
                headers: {
                    cookie: "blockMe=please"
                }
            }
            request(data, (err, res, json) => {
                assert.strictEqual(err, null)
                assert.strictEqual(res.statusCode, 401, "Expecting 401")
                helpers.validateError(json)
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
