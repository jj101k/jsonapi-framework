/**
 *
 */
class JsonAPIError {
    /**
     * @type {string}
     */
    code

    /**
     * @type {any}
     */
    detail

    /**
     * @type {string}
     */
    status

    /**
     * @type {string}
     */
    title

    /**
     *
     * @param {string} status
     * @param {string} code
     * @param {string} title
     * @param {any} detail
     */
    constructor(status, code, title, detail) {
        this.code = code
        this.detail = detail
        this.status = status
        this.title = title
    }

    /**
     *
     * @returns
     */
    toJSON() {
        return {
            status: this.status,
            code: this.code,
            title: this.title,
            detail: this.detail,
        }
    }
}

module.exports = JsonAPIError