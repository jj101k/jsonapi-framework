'use strict'

const assert = require('assert')
const helpers = require('./helpers')
const jsonApiTestServer = require('../example/server')

describe('Testing jsonapi-server', () => {
  [ { name: 'articles', count: 4 },
    { name: 'comments', count: 2 },
    { name: 'people', count: 4 },
    { name: 'photos', count: 5 },
    { name: 'tags', count: 5 }
  ].forEach(resource => {
    describe(`Searching for ${resource.name}`, () => {
      it(`should find ${resource.count}`, done => {
        const url = `http://localhost:16006/rest/${resource.name}`
        helpers.request({
          method: 'GET',
          url
        }, (err, res, json) => {
          assert.strictEqual(err, null)
          json = helpers.validateJson(json)
          assert.strictEqual(json.data.length, resource.count, `Expected ${resource.count} resources`)
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
