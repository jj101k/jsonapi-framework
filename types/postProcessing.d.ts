import * as express from "express"
import { ResourceConfig } from "./ResourceConfig"

/**
 *
 */
export type paramTree = {[key: string]: paramTree | string | string[]}

/**
 *
 */
export type Resource = {id: string} | {[key: string]: any}

/**
 *
 */
export type postProcessingRequest = express.Request & {processedFilter?: {operator: string, value: string}[]} | {params: paramTree}

/**
 *
 */
export type postProcessingResponse = express.Response & {
    data: Resource | Resource[]
    included?: Resource[]
}

/**
 *
 */
export interface postProcessingHandler {
    /**
     *
     * @param request
     * @param response
     */
    action(request: postProcessingRequest, response: postProcessingResponse): Promise<any>
}

type relationDatum = {
    type: string
    id: string
}

/**
 *
 */
export type item = {
    /**
     *
     */
    relationships?: {
        [key: string]: {
            meta: {
                relation: "primary",
                data?: relationDatum | relationDatum[]
            } | {
                relation: "foreign",
                as: string
                belongsTo: string
            }
        }
    }
}

/**
 *
 */
export type dataTree = {
    /**
     *
     */
    dataItems: item[],
    /**
     *
     */
    sub: {
        /**
         *
         */
        [key: string]: dataTree
    },
}

/**
 *
 */
export type includeTree = {
    /**
     *
     */
    dataItems: item[],
    /**
     *
     */
    filter: {
        [key: string]: string | string[]
    },
    /**
     *
     */
    resourceConfig: ResourceConfig<any>[],
    /**
     *
     */
    sub: {
        /**
         *
         */
        [key: string]: includeTree,
    }
}