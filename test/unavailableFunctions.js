'use strict'

const request = require('request')
const assert = require('assert')
const helpers = require('./helpers')
const jsonApiTestServer = require('../example/server')

describe('Testing jsonapi-server', () => {
    describe('unavailable functions', () => {
        it('responds with a clear error', done => {
            const data = {
                method: 'delete',
                url: 'http://localhost:16006/rest/photos/14'
            }
            request(data, (err, res, json) => {
                assert.strictEqual(err, null)
                json = helpers.validateError(json)
                assert.strictEqual(res.statusCode, 403, 'Expecting 403')
                assert.strictEqual(json.errors[0].detail, "The requested resource 'photos' does not support 'delete'")

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
