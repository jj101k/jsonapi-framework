import { JsonApiRequest } from "./Handler"
import { Response } from "express"
import { ResourceConfig } from "./ResourceConfig"

/**
 *
 */
export type paramTree = {[key: string]: paramTree | string | string[] | undefined}

/**
 *
 */
export type Resource = {id: string, type: string} | {[key: string]: any}

interface ObjectIdentity {
    id: string
    type: string
}

interface Relationship {
    data: ObjectIdentity[] | ObjectIdentity | null
    links: {
        self: string,
        related: string,
    }
}

export interface FullResource extends ObjectIdentity {
    attributes: Record<string, any>
    relationships: Record<string, Relationship>
}

/**
 *
 */
export type postProcessingRequest<T> = JsonApiRequest<T> & {processedFilter?: {operator: string, value: string}[]} | {params: paramTree}

/**
 *
 */
export type postProcessingResponse = Response & {
    data: FullResource | FullResource[]
    included?: FullResource[]
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
    action<T>(request: postProcessingRequest<T>, response: postProcessingResponse): Promise<any>
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