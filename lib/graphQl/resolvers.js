'use strict'

const rerouter = require('../rerouter')
const RetainsJsonApiPrivate = require('../RetainsJsonApiPrivate')

/**
 *
 */
class resolvers extends RetainsJsonApiPrivate {
    /**
     *
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
     #generateFieldsQueryFromAst(ast) {
        /**
         * @type {import("graphql").SelectionNode[]}
         */
        const fields = []
        for(const fieldAST of ast.fieldNodes || []) {
            if(fieldAST.selectionSet.selections) {
                fields.push(...fieldAST.selectionSet.selections)
            }
        }
        return fields.map(thing => (thing.name || {}).value).filter(a => a).join(",")
    }

    /**
     *
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    #generateFilterQueryFromAst(ast) {
        /**
         * @type {import("graphql").ArgumentNode[]}
         */
        const args = []
        for(const fieldAST of ast.fieldNodes || []) {
            if(fieldAST.arguments) {
                args.push(...fieldAST.arguments)
            }
        }
        return Object.fromEntries(
            args.map(thing => [thing.name.value, thing.value.value])
        )
    }

    /**
     *
     * @param {{[key: string]: *}} args
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @returns
     */
    #generateResourceFromArgs(args, resourceConfig) {
        let argsFound
        if (Object.keys(args).length === 1 && args[resourceConfig.resource]) {
            argsFound = args[resourceConfig.resource]
        } else {
            argsFound = args
        }

        const requestedEntries = Object.entries(resourceConfig.attributes).filter(([attribute]) => argsFound[attribute])

        return {
            type: resourceConfig.resource,
            attributes: Object.fromEntries(
                requestedEntries.filter(([attribute, joiSchema]) => !joiSchema._settings).map(
                    ([attribute]) => [attribute, argsFound[attribute]]
                )
            ),
            relationships: Object.fromEntries(
                requestedEntries.filter(([attribute, joiSchema]) => joiSchema._settings).map(
                    ([attribute, joiSchema]) => {
                        const related = (joiSchema._settings.__one || joiSchema._settings.__many)[0]
                        if(Array.isArray(argsFound[attribute])) {
                            return [
                                attribute,
                                {data: argsFound[attribute].map(relation => ({...relation, type: related}))},
                            ]
                        } else {
                            return [
                                attribute,
                                {data: {...argsFound[attribute], type: related}},
                            ]
                        }
                    }
                )
            ),
        }
    }

    /**
     *
     * @param {string} httpMethod
     * @param {string} path
     * @param {{[key: string]: *}} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
     #rerouteTo(httpMethod, path, args, req, ast) {
        return new Promise((resolve, reject) => {
            new rerouter(this.jsonApi, this.privateData).route(
                {
                    method: httpMethod,
                    uri: path,
                    params: {
                        fields: this.#generateFieldsQueryFromAst(ast),
                        filter: this.#generateFilterQueryFromAst(ast),
                        ...args,
                    },
                    originalRequest: {
                        headers: req.headers || {},
                        cookies: req.cookies || {},
                    }
                },
                (err, json) => {
                    if (err) return reject(err.errors.map(e => e.detail))
                    else resolve(json.data)
                }
            )
        })
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string} tail
     * @returns
     */
    #resourcePath(resourceConfig, tail = "") {
        if(tail) {
            return this.jsonApi._apiConfig.pathPrefix + resourceConfig.resource + "/" + tail
        } else {
            return this.jsonApi._apiConfig.pathPrefix + resourceConfig.resource
        }
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {string} attribute
     * @param {import("../../types/jsonApi").ResourceConfig} parent
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    search(resourceConfig, attribute, parent, args, req, ast) {
        if (!parent) {
            // If we don't have a JSON:API resource, go get it
            return this.#rerouteTo("GET", this.#resourcePath(resourceConfig), {filter: args}, req, ast)
        } else if (!resourceConfig.attributes[attribute]._settings) {
            // Simple attributes can be plucked from the JSON:API resource
            return parent.attributes[attribute]
        } else {
            // Related resources need to be requested via the related link
            return this.#rerouteTo("GET", parent.relationships[attribute].links.related, {filter: args}, req, ast)
        }
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("../../types/jsonApi").ResourceConfig} parent
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    create(resourceConfig, parent, args, req, ast) {
        return this.#rerouteTo("POST", this.#resourcePath(resourceConfig),
            {data: this.#generateResourceFromArgs(args, resourceConfig)}, req, ast)
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("../../types/jsonApi").ResourceConfig} parent
     * @param {{[key: string]: {id: string} | *}} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    update(resourceConfig, parent, args, req, ast) {
        return this.#rerouteTo("PATCH", this.#resourcePath(resourceConfig, args[resourceConfig.resource].id),
            {data: this.#generateResourceFromArgs(args, resourceConfig)}, req, ast)
    }

    /**
     *
     * @param {import("../../types/jsonApi").ResourceConfig} resourceConfig
     * @param {import("../../types/jsonApi").ResourceConfig} parent
     * @param {{id: string, [key: string]: *}} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    async delete(resourceConfig, parent, args, req, ast) {
        const path = this.#resourcePath(resourceConfig, args.id)
        const resource = await this.#rerouteTo("GET", path, {}, req, ast)
        await this.#rerouteTo("DELETE", path, {}, req, ast)
        return resource
    }
}

module.exports = resolvers