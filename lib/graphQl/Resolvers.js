"use strict"

const rerouter = require("../rerouter")
const RetainsJsonApiPrivate = require("../RetainsJsonApiPrivate")
const SchemaHelper = require("../SchemaHelper")

/**
 * @typedef {import("../../types/Handler").JsonApiRequest} JsonApiRequest
 * @typedef {import("graphql").ArgumentNode} ArgumentNode
 * @typedef {import("graphql").GraphQLResolveInfo} GraphQLResolveInfo
 * @typedef {import("../../types/jsonApi").ResourceConfig} ResourceConfig
 * @typedef {import("graphql").SelectionNode} SelectionNode
 */

/**
 *
 */
class Resolvers extends RetainsJsonApiPrivate {
    /**
     *
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    #generateFieldsQueryFromAst(ast) {
        /**
         * @type {SelectionNode[]}
         */
        const fields = []
        for(const fieldAST of ast.fieldNodes || []) {
            if(fieldAST.selectionSet?.selections) {
                fields.push(...fieldAST.selectionSet.selections)
            }
        }
        return fields.map(thing => "name" in thing ? thing.name?.value : null).filter(a => a).join(",")
    }

    /**
     *
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    #generateFilterQueryFromAst(ast) {
        if(!ast.fieldNodes) return []
        /**
         * @type {ArgumentNode[]}
         */
        const args = []
        for(const fieldAST of ast.fieldNodes) {
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
     * @param {ResourceConfig} resourceConfig
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
                requestedEntries.filter(([attribute, joiSchema]) => !SchemaHelper.for(joiSchema).isRelationship).map(
                    ([attribute]) => [attribute, argsFound[attribute]]
                )
            ),
            relationships: Object.fromEntries(
                requestedEntries.filter(([attribute, joiSchema]) => SchemaHelper.for(joiSchema).isRelationship).map(
                    ([attribute, joiSchema]) => {
                        const related = SchemaHelper.for(joiSchema).relationTypes[0]
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
     * @param {import("../../types/Handler").HttpVerbs} httpMethod
     * @param {string} path
     * @param {{[key: string]: *}} args
     * @param {JsonApiRequest} req
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    async #rerouteTo(httpMethod, path, args, req, ast) {
        let json
        try {
            json = await new rerouter(this.jsonApi, this.privateData).route({
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
            })
        } catch(err) {
            throw err.errors.map(e => e.detail)
        }
        return json.data
    }

    /**
     *
     * @param {ResourceConfig} resourceConfig
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
     * @param {ResourceConfig} resourceConfig
     * @param {string} attribute
     * @param {import("../../types/postProcessing").FullResource} parent
     * @param {*} args
     * @param {JsonApiRequest} req
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    search(resourceConfig, attribute, parent, args, req, ast) {
        if (!parent) {
            // If we don't have a JSON:API resource, go get it
            return this.#rerouteTo("GET", this.#resourcePath(resourceConfig), {filter: args}, req, ast)
        } else if (!SchemaHelper.forOptional(resourceConfig.attributes[attribute])?.isRelationship) {
            // Simple attributes can be plucked from the JSON:API resource
            return parent.attributes[attribute]
        } else {
            // Related resources need to be requested via the related link
            return this.#rerouteTo("GET", parent.relationships[attribute].links.related, {filter: args}, req, ast)
        }
    }

    /**
     *
     * @param {ResourceConfig} resourceConfig
     * @param {ResourceConfig} parent
     * @param {*} args
     * @param {JsonApiRequest} req
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    create(resourceConfig, parent, args, req, ast) {
        const data = this.#generateResourceFromArgs(args, resourceConfig)
        return this.#rerouteTo("POST", this.#resourcePath(resourceConfig), {data}, req, ast)
    }

    /**
     *
     * @param {ResourceConfig} resourceConfig
     * @param {ResourceConfig} parent
     * @param {{[key: string]: {id: string} | *}} args
     * @param {JsonApiRequest} req
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    update(resourceConfig, parent, args, req, ast) {
        const data = this.#generateResourceFromArgs(args, resourceConfig)
        const path = this.#resourcePath(resourceConfig, args[resourceConfig.resource].id)
        return this.#rerouteTo("PATCH", path, {data}, req, ast)
    }

    /**
     *
     * @param {ResourceConfig} resourceConfig
     * @param {ResourceConfig} parent
     * @param {{id: string, [key: string]: *}} args
     * @param {JsonApiRequest} req
     * @param {GraphQLResolveInfo} ast
     * @returns
     */
    async delete(resourceConfig, parent, args, req, ast) {
        const path = this.#resourcePath(resourceConfig, args.id)
        const resource = await this.#rerouteTo("GET", path, {}, req, ast)
        await this.#rerouteTo("DELETE", path, {}, req, ast)
        return resource
    }
}

module.exports = Resolvers