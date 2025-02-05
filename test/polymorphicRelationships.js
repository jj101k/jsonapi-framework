"use strict"

const assert = require("assert")
const helpers = require("./helpers")
const jsonApiTestServer = require("../example/server")
const {gql, GraphQLClient} = require("graphql-request")

const client = new GraphQLClient("http://localhost:16006/rest/", {
    headers: {
        Accept: "application/json"
    }
})

describe("Testing jsonapi-server", () => {
    describe("polymorphic relationships", () => {
        it("including the tuple", done => {
            const url = "http://localhost:16006/rest/tuples?include=media"
            helpers.request({
                method: "GET",
                url
            }, (err, res, json) => {
                assert.strictEqual(err, null)
                json = helpers.validateJson(json)

                assert.strictEqual(res.statusCode, 200, "Expecting 200 OK")
                assert.strictEqual(json.data.length, 2, "Should be 2 main resources")
                assert.strictEqual(json.included.length, 4, "Should be 4 included resources")

                done()
            })
        })

        context("including through the tuple", () => {
            it("including the first half", done => {
                const url = "http://localhost:16006/rest/tuples?include=media.photographer"
                helpers.request({
                    method: "GET",
                    url
                }, (err, res, json) => {
                    assert.strictEqual(err, null)
                    json = helpers.validateJson(json)

                    assert.strictEqual(res.statusCode, 200, "Expecting 200 OK")
                    assert.strictEqual(json.included.length, 6, "Should be no included resources")

                    const markExists = json.included.filter(resource => {
                        return resource.attributes.firstname === "Mark"
                    })
                    assert.ok(markExists, "Mark should be included as a photographer")

                    done()
                })
            })

            it("including the second half", done => {
                const url = "http://localhost:16006/rest/tuples?include=media.author"
                helpers.request({
                    method: "GET",
                    url
                }, (err, res, json) => {
                    assert.strictEqual(err, null)
                    json = helpers.validateJson(json)

                    assert.strictEqual(res.statusCode, 200, "Expecting 200 OK")
                    assert.strictEqual(json.included.length, 6, "Should be no included resources")

                    const pedroExists = json.included.filter(resource => {
                        return resource.attributes.firstname === "Pedro"
                    })
                    assert.ok(pedroExists, "Pedro should be included as an author")

                    done()
                })
            })

            it("including both", done => {
                const url = "http://localhost:16006/rest/tuples?include=media.photographer,media.author"
                helpers.request({
                    method: "GET",
                    url
                }, (err, res, json) => {
                    assert.strictEqual(err, null)
                    json = helpers.validateJson(json)

                    assert.strictEqual(res.statusCode, 200, "Expecting 200 OK")
                    assert.strictEqual(json.included.length, 7, "Should be no included resources")

                    const markExists = json.included.filter(resource => {
                        return resource.attributes.firstname === "Mark"
                    })
                    assert.ok(markExists, "Mark should be included as a photographer")

                    const pedroExists = json.included.filter(resource => {
                        return resource.attributes.firstname === "Pedro"
                    })
                    assert.ok(pedroExists, "Pedro should be included as an author")

                    done()
                })
            })
        })

        it("works with GraphQL", () => client.request(gql`
            {
                tuples {
                    preferred {
                        ... on articles {
                            author {
                                firstname
                            }
                        }
                        ... on photos {
                            photographer {
                                firstname
                            }
                        }
                    }
                }
            }
        `).then(result => {
            /**
             * FIXME This is a pragmatic fix to guarantee order. Tuples in GraphQL
             * Need to be thoroughly looked at.
             */
            const orderedResult = {
                tuples: [
                    result.tuples.filter((result) => result.preferred.author)[0],
                    result.tuples.filter((result) => result.preferred.photographer)[0]
                ]
            }

            assert.deepEqual(orderedResult, {
                tuples: [
                    {
                        preferred: {
                            author: {
                                firstname: "Rahul"
                            }
                        }
                    },
                    {
                        preferred: {
                            photographer: {
                                firstname: "Mark"
                            }
                        }
                    }
                ]
            })
        }))
    })

    before(() => {
        jsonApiTestServer.start()
    })
    after(() => {
        jsonApiTestServer.close()
    })
})
