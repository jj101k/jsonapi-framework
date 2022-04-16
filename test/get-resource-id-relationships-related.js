"use strict"

const assert = require("assert")
const helpers = require("./helpers")
const jsonApiTestServer = require("../example/server")

describe("Testing jsonapi-server", () => {
    describe("forward lookup", () => {
        it("unknown id should error", done => {
            const url = "http://localhost:16006/rest/articles/foobar/relationships/author"
            helpers.request({
                method: "GET",
                url
            }, (err, res, json) => {
                assert.strictEqual(err, null)
                helpers.validateError(json)
                assert.strictEqual(res.statusCode, 404, "Expecting 404")

                done()
            })
        })

        it("unknown relation should error", done => {
            const url = "http://localhost:16006/rest/articles/de305d54-75b4-431b-adb2-eb6b9e546014/relationships/foobar"
            helpers.request({
                method: "GET",
                url
            }, (err, res, json) => {
                assert.strictEqual(err, null)
                helpers.validateError(json)
                assert.strictEqual(res.statusCode, 404, "Expecting 404")

                done()
            })
        })

        it("Lookup by id", done => {
            const url = "http://localhost:16006/rest/articles/de305d54-75b4-431b-adb2-eb6b9e546014/relationships/author"
            helpers.request({
                method: "GET",
                url
            }, (err, res, json) => {
                assert.strictEqual(err, null)
                json = helpers.validateJson(json)

                assert.strictEqual(res.statusCode, 200, "Expecting 200 OK")
                assert.strictEqual(json.data.type, "people", "Should be a people resource")

                assert.ok(json instanceof Object, "Response should be an object")
                assert.ok(json.meta instanceof Object, "Response should have a meta block")
                assert.ok(json.links instanceof Object, "Response should have a links block")
                assert.strictEqual(typeof json.links.self, "string", "Response should have a \"self\" link")

                let someDataBlock = json.data
                if (!(someDataBlock instanceof Array)) someDataBlock = [someDataBlock]
                someDataBlock.forEach(dataBlock => {
                    const keys = Object.keys(dataBlock)
                    assert.deepEqual(keys, ["type", "id", "meta"], "Relationship data blocks should have specific properties")
                    assert.strictEqual(typeof dataBlock.id, "string", "Relationship data blocks id should be string")
                    assert.strictEqual(typeof dataBlock.type, "string", "Relationship data blocks type should be string")
                })

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
