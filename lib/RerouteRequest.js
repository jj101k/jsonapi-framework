/**
 * @typedef {import("../types/postProcessing").paramTree} paramTree
 * @typedef {{method: import("../types/Handler").HttpVerbs, uri: string,
 * originalRequest: {headers: any, cookies: any, originalUrl: string},
 * params?: paramTree}} routeRequest
 */

/**
 *
 */
class RerouteRequest {
    /**
     * @param {string} path
     */
    #expandParamPath(path) {
        const md = path.match(/^([^\x5b]+)((?:\x5b[^\x5b\x5d]+\x5d)*)$/)
        if(!md) {
            throw new Error(`Unparseable param path: ${path}`)
        }
        const head = md[1]
        const tail = md[2]
        if(tail) {
            const parts = tail.slice(1, tail.length - 1).split("][")
            return [head, ...parts]
        } else {
            return [head]
        }
    }

    /**
     *
     * @param {Iterable<[string, string]>} params
     * @returns {paramTree}
     */
    #expandParams(params) {
        /**
         * @type {paramTree}
         */
        const tree = {}
        for(const [key, value] of params) {
            const keyComponents = this.#expandParamPath(key)
            /**
             * @type {string}
             */
            const lastComponent = keyComponents.pop()

            /**
             * @type {paramTree | string}
             */
            let subTree = tree
            for(const subPath of keyComponents) {
                if(!subTree[subPath]) {
                    subTree[subPath] = {}
                }
                subTree = subTree[subPath]
            }

            if(subTree[lastComponent]) {
                if(typeof subTree[lastComponent] == "string") {
                    subTree[lastComponent] = [subTree[lastComponent]]
                }
                if(!Array.isArray(subTree[lastComponent])) {
                    throw new Error(`Contradictory param at ${key}`)
                }
                subTree[lastComponent].push(value)
            } else {
                subTree[lastComponent] = value
            }
        }
        return tree
    }

    /**
     *
     * @param {paramTree} objA
     * @param {paramTree | undefined} objB
     * @returns
     */
    #mergeParams(objA, objB) {
        if (!objB) {
            return {...objA}
        }
        return {
            ...objA,
            ...objB,
            ...Object.fromEntries(
                Object.keys(objA).filter(k => k in objB).map(k => [k, this.#mergeParamtreeValues(objA[k], objB[k])])
            ),
        }
    }

    /**
     *
     * @param {string | string[] | paramTree | undefined} valueA
     * @param {string | string[] | paramTree | undefined} valueB
     * @returns
     */
    #mergeParamtreeValues(valueA, valueB) {
        if(valueA === undefined) {
            return valueB
        } else if(valueB === undefined) {
            return valueA
        }
        if(Array.isArray(valueA) && Array.isArray(valueB)) {
            return [...valueA, ...valueB]
        } else if(Array.isArray(valueA)) {
            return [...valueA, valueB]
        } else if(Array.isArray(valueB)) {
            return [valueA, ...valueB]
        } else if(typeof valueA === "object" && typeof valueB === "object") {
            return this.#mergeParams(valueA, valueB)
        } else if(typeof valueA === "string" && typeof valueB === "string") {
            return [valueA, valueB]
        } else {
            throw new Error(`Incompatible types to merge, ${typeof valueA} vs ${typeof valueB}`)
        }
    }

    /**
     *
     */
    cookies

    /**
     *
     */
    headers

    /**
     * @type {string}
     */
    originalUrl

    /**
     * @type {paramTree}
     */
    params

    /**
     * @type {string}
     */
    url

    /**
     *
     * @param {routeRequest} newRequest
     */
    constructor(newRequest) {
        this.url = newRequest.uri
        this.originalUrl = newRequest.originalRequest.originalUrl
        this.headers = newRequest.originalRequest.headers
        this.cookies = newRequest.originalRequest.cookies

        const url = new URL(newRequest.uri, "https://localhost")

        this.params = this.#mergeParams(this.#expandParams(url.searchParams), newRequest.params)
    }
}

module.exports = RerouteRequest