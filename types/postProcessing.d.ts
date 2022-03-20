import * as express from "express"
import { ResourceConfig } from "./ResourceConfig"

/**
 *
 */
export interface postProcessingHandler {
    /**
     *
     * @param request
     * @param response
     * @param callback
     */
    action(request: express.Request, response: express.Response, callback: (error?: any) => any)
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
    _dataItems: item[],
    /**
     *
     */
    [key: string]: dataTree
}

/**
 *
 */
export type includeTree = {
    /**
     *
     */
    _dataItems: item[],
    /**
     *
     */
    _filter: {
        [key: string]: string | string[]
    },
    /**
     *
     */
    _resourceConfig: ResourceConfig[],
    /**
     *
     */
    [key: string]: includeTree,
}