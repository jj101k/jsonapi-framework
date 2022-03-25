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
     */
    action(request: express.Request, response: express.Response): Promise<any>
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