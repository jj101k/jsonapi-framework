'use strict'
const ourJoi = require('./ourJoi')
const url = require('url')

/**
 *
 */
class pagination {
    /**
     *
     */
    static joiPageDefinition = {
        page: ourJoi.Joi.object().keys({
            offset: ourJoi.Joi.number()
                .description('The first record to appear in the resulting payload')
                .example(0),
            limit: ourJoi.Joi.number()
                .description('The number of records to appear in the resulting payload')
                .example(50)
        })
    }

    /**
     *
     * @param {*} request
     * @param {*} handlerTotal
     * @returns
     */
    static generateMetaSummary(request, handlerTotal) {
        return {
            offset: request.params.page && request.params.page.offset,
            limit: request.params.page && request.params.page.limit,
            total: handlerTotal
        }
    }

    /**
     *
     * @param {*} request
     */
    static validatePaginationParams(request) {
        if (!request.params.page) {
            request.params.page = { }
        }
        const page = request.params.page

        page.offset = parseInt(page.offset, 10) || 0
        page.limit = parseInt(page.limit, 10) || 50
    }

    /**
     *
     * @param {*} request
     * @param {*} results
     * @returns
     */
    static enforcePagination(request, results) {
        return results.slice(0, request.params.page.size)
    }

    /**
     *
     * @param {*} request
     * @param {*} handlerTotal
     * @returns
     */
    static generatePageLinks(request, handlerTotal) {
        const pageData = request.params.page
        if (!handlerTotal || !pageData) {
            return { }
        }

        const lowerLimit = pageData.offset
        const upperLimit = pageData.offset + pageData.limit

        if ((lowerLimit === 0) && (upperLimit > handlerTotal)) {
            return { }
        }

        const pageLinks = { }
        const theirRequest = url.parse(request.route.combined, true)
        theirRequest.search = null

        if (lowerLimit > 0) {
            theirRequest.query['page[offset]'] = 0
            pageLinks.first = url.format(theirRequest)

            if (pageData.offset > 0) {
                let previousPageOffset = pageData.offset - pageData.limit
                if (previousPageOffset < 0) {
                    previousPageOffset = 0
                }
                theirRequest.query['page[offset]'] = previousPageOffset
                pageLinks.prev = url.format(theirRequest)
            }
        }

        if (upperLimit < handlerTotal) {
            let lastPage = (Math.floor(handlerTotal / pageData.limit) * pageData.limit)
            if (lastPage === handlerTotal) lastPage -= pageData.limit
            theirRequest.query['page[offset]'] = lastPage
            pageLinks.last = url.format(theirRequest)

            if ((pageData.offset + pageData.limit) < handlerTotal) {
                const nextPageOffset = pageData.offset + pageData.limit
                theirRequest.query['page[offset]'] = nextPageOffset
                pageLinks.next = url.format(theirRequest)
            }
        }

        return pageLinks
    }
}

module.exports = pagination