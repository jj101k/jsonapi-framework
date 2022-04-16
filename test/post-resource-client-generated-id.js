"use strict"

const request = require("request")
const assert = require("assert")

const helpers = require("./helpers")
const jsonApiTestServer = require("../example/server")

describe("Testing jsonapi-server", () => {
    describe("Creating a new resource with client-generated ID", () => {
        describe("creates a resource", () => {
            const id = "e4a1a34f-151b-41ca-a0d9-21726068ba8b"

            it("works", done => {
                const data = {
                    method: "post",
                    url: "http://localhost:16006/rest/people",
                    headers: {
                        "Content-Type": "application/vnd.api+json"
                    },
                    body: JSON.stringify({
                        data: {
                            id,
                            type: "people",
                            attributes: {
                                firstname: "Harry",
                                lastname: "Potter",
                                email: "harry.potter@hogwarts.edu.uk"
                            }
                        }
                    })
                }
                helpers.request(data, (err, res, json) => {
                    assert.strictEqual(err, null)
                    json = helpers.validateJson(json)

                    assert.strictEqual(json.data.id, id)
                    assert.strictEqual(res.headers.location, `http://localhost:16006/rest/people/${json.data.id}`)
                    assert.strictEqual(res.statusCode, 201, "Expecting 201")
                    assert.strictEqual(json.data.type, "people", "Should be a people resource")

                    done()
                })
            })

            it("new resource is retrievable", done => {
                const url = `http://localhost:16006/rest/people/${id}`
                helpers.request({
                    method: "GET",
                    url
                }, (err, res, json) => {
                    assert.strictEqual(err, null)
                    json = helpers.validateJson(json)

                    assert.strictEqual(res.statusCode, 200, "Expecting 200 OK")
                    assert.strictEqual(json.included.length, 0, "Should be no included resources")

                    done()
                })
            })

            it("deletes the resource", done => {
                const data = {
                    method: "delete",
                    url: "http://localhost:16006/rest/people/" + id
                }
                request(data, (err, res, json) => {
                    assert.strictEqual(err, null)
                    json = JSON.parse(json)
                    const keys = Object.keys(json)
                    assert.deepEqual(keys, ["meta"], "Should only have a meta block")
                    assert.strictEqual(res.statusCode, 200, "Expecting 200")

                    done()
                })
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
