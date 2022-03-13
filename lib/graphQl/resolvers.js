'use strict'

const rerouter = require('../rerouter')
const RetainsJsonApiPrivate = require('../RetainsJsonApiPrivate')

/**
 *
 */
class resolvers extends RetainsJsonApiPrivate {
    /**
     *
     * @param {*} resourceConfig
     * @param {*} attribute
     * @param {*} parent
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    search(resourceConfig, attribute, parent, args, req, ast) {
        let path
        // If we don't have a JSON:API resource, go get it
        if (!parent) {
            path = this.jsonApi._apiConfig.pathPrefix + resourceConfig.resource
            return this.rerouteTo('GET', path, { filter: args }, req, ast)
        }
        // Simple attributes can be plucked from the JSON:API resource
        if (!resourceConfig.attributes[attribute]._settings) {
            return parent.attributes[attribute]
        }
        // Related resources need to be requested via the related link
        path = parent.relationships[attribute].links.related
        return this.rerouteTo('GET', path, { filter: args }, req, ast)
    }

    /**
     *
     * @param {*} resourceConfig
     * @param {*} parent
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    create(resourceConfig, parent, args, req, ast) {
        const path = this.jsonApi._apiConfig.pathPrefix + resourceConfig.resource
        const data = this.generateResourceFromArgs(args, resourceConfig)
        return this.rerouteTo('POST', path, { data }, req, ast)
    }

    /**
     *
     * @param {*} resourceConfig
     * @param {*} parent
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    update(resourceConfig, parent, args, req, ast) {
        const path = `${this.jsonApi._apiConfig.pathPrefix + resourceConfig.resource}/${args[resourceConfig.resource].id}`
        const data = this.generateResourceFromArgs(args, resourceConfig)
        return this.rerouteTo('PATCH', path, { data }, req, ast)
    }

    /**
     *
     * @param {*} resourceConfig
     * @param {*} parent
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    delete(resourceConfig, parent, args, req, ast) {
        const path = `${this.jsonApi._apiConfig.pathPrefix + resourceConfig.resource}/${args.id}`
        let resource
        return this.rerouteTo('GET', path, { }, req, ast)
            .then(originalResource => {
                resource = originalResource
                return this.rerouteTo('DELETE', path, { }, req, ast)
            }).then(() => resource)
    }

    /**
     *
     * @param {*} method
     * @param {*} path
     * @param {*} args
     * @param {*} req
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    rerouteTo(method, path, args, req, ast) {
        return new Promise((resolve, reject) => {
            new rerouter(this.jsonApi, this.privateData).route({
                method,
                uri: path,
                params: {
                    fields: this.generateFieldsQueryFromAst(ast),
                    filter: this.generateFilterQueryFromAst(ast),
                    ...args,
                },
                originalRequest: {
                    headers: req.headers || { },
                    cookies: req.cookies || { }
                }
            }, (err, json) => {
                if (err) return reject(err.errors.map(e => e.detail))
                resolve(json.data)
            })
        })
    }

    /**
     *
     * @param {*} args
     * @param {*} resourceConfig
     * @returns
     */
    generateResourceFromArgs(args, resourceConfig) {
        if ((Object.keys(args).length === 1) && (args[resourceConfig.resource])) {
            args = args[resourceConfig.resource]
        }

        const data = {
            type: resourceConfig.resource,
            attributes: { },
            relationships: { }
        }

        Object.keys(resourceConfig.attributes).forEach(attribute => {
            const joiSchema = resourceConfig.attributes[attribute]
            if (!args[attribute]) return
            if (!joiSchema._settings) {
                data.attributes[attribute] = args[attribute]
            } else {
                data.relationships[attribute] = {
                    data: args[attribute]
                };
                [].concat(data.relationships[attribute].data).forEach(relation => {
                    relation.type = (joiSchema._settings.__one || joiSchema._settings.__many)[0]
                })
            }
        })

        return data
    }

    /**
     *
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    generateFieldsQueryFromAst(ast) {
        const arrays = (ast.fieldNodes || []).map(fieldAST => fieldAST.selectionSet.selections || [ ])
        const combined = [].concat.apply([], arrays)
        let fields = combined.map(thing => (thing.name || { }).value).filter(a => a)
        fields = fields.join(',')
        return fields
    }

    /**
     *
     * @param {import("graphql").GraphQLResolveInfo} ast
     * @returns
     */
    generateFilterQueryFromAst(ast) {
        const arrays = (ast.fieldNodes || []).map(function (fieldAST) {
            return fieldAST.arguments || [ ]
        })
        const combined = [].concat.apply([], arrays)
        const filter = { }
        combined.forEach(thing => {
            filter[thing.name.value] = thing.value.value
        })
        return filter
    }
}

module.exports = resolvers