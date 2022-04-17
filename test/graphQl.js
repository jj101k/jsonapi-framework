"use strict"

const assert = require("assert")
const jsonApiTestServer = require("../example/server")
const {gql, GraphQLClient} = require("graphql-request")

const client = new GraphQLClient("http://localhost:16006/rest/", {
    headers: {
        Accept: "application/json"
    }
})

describe("Testing jsonapi-server graphql", () => {
    describe("read operations", () => {
        it("filter with primary join and filter", () => client.request(gql`
            {
                photos(width: "<1000") {
                    url
                    width
                    tags
                    photographer(firstname: "Rahul") {
                        firstname
                    }
                }
            }
        `).then(result => {
            assert.deepEqual(result, {
                photos: [
                    {
                        url: "http://www.example.com/penguins",
                        width: 60,
                        tags: ["galapagos", "emperor"],
                        photographer: null
                    },
                    {
                        url: "http://www.example.com/treat",
                        width: 350,
                        tags: ["black", "green"],
                        photographer: {
                            firstname: "Rahul"
                        }
                    }
                ]
            })
        }))

        it("filter with foreign join and filter", () => client.request(gql`
            {
                people(firstname: "Rahul") {
                    firstname
                    photos(width: "<1000") {
                        url
                        width
                    }
                }
            }
        `).then(result => {
            assert.deepEqual(result, {
                people: [
                    {
                        firstname: "Rahul",
                        photos: [
                            {
                                url: "http://www.example.com/treat",
                                width: 350
                            }
                        ]
                    }
                ]
            })
        }))

        it("filters with variables", () => client.request(gql`
            query People($firstname: String!) {
                people(firstname: $firstname) {
                    lastname
                }
            }
        `, {firstname: "Rahul"}).then(result => {
            assert.deepEqual(result, {
                people: [
                    {
                        lastname: "Patel"
                    }
                ]
            })
        }))
    })

    describe("write operations", () => {
        let tagId = null

        it("create a tag", () => client.request(gql`
            mutation createTags {
                createTags(tags: {
                    name: "test1"
                    parent: {
                        id: "7541a4de-4986-4597-81b9-cf31b6762486"
                    }
                }) {
                    id
                    name
                    parent {
                        id
                        name
                    }
                }
            }
        `).then(result => {
            assert.strictEqual(result.createTags.name, "test1")
            assert.strictEqual(result.createTags.parent.id, "7541a4de-4986-4597-81b9-cf31b6762486")
            assert.strictEqual(result.createTags.parent.name, "live")
            tagId = result.createTags.id
        }))

        it("update the new tag", () => client.request(gql`
            mutation updateTags {
                updateTags(tags: {
                    id: "${tagId}"
                    name: "test2"
                    parent: {
                        id: "68538177-7a62-4752-bc4e-8f971d253b42"
                    }
                }) {
                    id
                    name
                    parent {
                        id
                        name
                    }
                }
            }
        `).then(result => {
            assert.deepEqual(result, {
                updateTags: {
                    id: tagId,
                    name: "test2",
                    parent: {
                        id: "68538177-7a62-4752-bc4e-8f971d253b42",
                        name: "development"
                    }
                }
            })
        }))

        it("deletes the tag", () => client.request(gql`
            mutation deleteTags {
                deleteTags(id: "${tagId}") {
                name
                }
            }
        `).then(result => {
            assert.deepEqual(result, {
                deleteTags: {
                    name: "test2"
                }
            })
        }))

        it("really is gone", () => client.request(gql`
            {
                tags(id: "${tagId}") {
                name
                }
            }
        `).then(result => {
            assert.deepEqual(result, {
                tags: []
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
