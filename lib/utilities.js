/**
 *
 */
class utilities {
    /**
     *
     * @param {string | string[]} v
     */
    static commaSeparatedArray(v) {
        if(Array.isArray(v)) {
            return v.join(",").split(",")
        } else if(typeof v == "string") {
            return v.split(",")
        } else {
            return v
        }
    }

    /**
     *
     * @param {*} v
     * @returns
     */
    static stringIsh(v) {
        return "" + v
    }
}

module.exports = utilities