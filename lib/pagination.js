"use strict"
const OurJoi = require("./OurJoi")

/**
 * @typedef {import("../types/Handler").JsonApiRequest} JsonApiRequest
 */

/**
 *
 */
class pagination {
    /**
     *
     */
    static joiPageDefinition = {
        page: OurJoi.object().keys({
            offset: OurJoi.number()
                .description("The first record to appear in the resulting payload")
                .example(0),
            limit: OurJoi.number()
                .description("The number of records to appear in the resulting payload")
                .example(50)
        })
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {number} handlerTotal
     * @returns
     */
    static generateMetaSummary(request, handlerTotal) {
        return {
            offset: request.params.page?.offset,
            limit: request.params.page?.limit,
            total: handlerTotal
        }
    }

    /**
     *
     * @param {JsonApiRequest} request
     */
    static retainPaginationParams(request) {
        if (!request.params.page) {
            request.params.page = { }
        }
        const page = request.params.page

        page.offset = +(page.offset || 0)
        page.limit = +(page.limit || 50) || 50
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {any[]} results
     * @returns
     */
    static enforcePagination(request, results) {
        if(typeof request.params.page?.size == "string") {
            return results.slice(0, +request.params.page.size)
        } else {
            return results.slice(0, request.params.page?.size)
        }
    }

    /**
     *
     * @param {JsonApiRequest} request
     * @param {number} [handlerTotal]
     * @returns
     */
    static generatePageLinks(request, handlerTotal = undefined) {
        const pageData = request.params.page
        if (!handlerTotal || !pageData) {
            return { }
        }

        const limit = +(pageData.limit || 0)

        const lowerLimit = +(pageData.offset || 0)
        const upperLimit = lowerLimit + limit

        if (lowerLimit === 0 && upperLimit > handlerTotal) {
            return { }
        }

        const pageLinks = { }
        const theirRequest = new URL(request.route.combined)

        if (lowerLimit > 0) {
            theirRequest.searchParams.set("page[offset]", "0")
            pageLinks.first = theirRequest.toString()
            if (lowerLimit > 0) {
                let previousPageOffset = lowerLimit - limit
                if (previousPageOffset < 0) {
                    previousPageOffset = 0
                }
                theirRequest.searchParams.set("page[offset]", "" + previousPageOffset)
                pageLinks.prev = theirRequest.toString()
            }
        }

        if (upperLimit < handlerTotal) {
            let lastPage = (Math.floor(handlerTotal / limit) * limit)
            if (lastPage === handlerTotal) lastPage -= limit
            theirRequest.searchParams.set("page[offset]", "" + lastPage)
            pageLinks.last = theirRequest.toString()

            if (lowerLimit + limit < handlerTotal) {
                const nextPageOffset = lowerLimit + limit
                theirRequest.searchParams.set("page[offset]", "" + nextPageOffset)
                pageLinks.next = theirRequest.toString()
            }
        }

        return pageLinks
    }
}

module.exports = pagination