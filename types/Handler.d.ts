/**
 * @module @jagql/framework/lib/handlers/Handler
 */

import {Request, Response} from 'express'
import { paramTree } from './postProcessing'
import {ResourceConfig} from './ResourceConfig'

export type HttpVerbs = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'

export interface JsonApiRequestBasic<A=any> {
  params: {
    page?: {
      offset?: string | number
      limit?: string | number
      size?: string | number
    }
    relation?: string
  } & paramTree & A
  headers: any
  safeHeaders: any
  cookies: any
  originalUrl: string
  express: {
    req: Request,
    res: Response | undefined,
  }
  /**
   *
   */
  postProcess?: string
  route: {
    verb: HttpVerbs
    host: string | undefined
    base: string | undefined
    path: string
    query: string
    combined: string
  }
}

export interface JsonApiRequest<T, A=any> extends JsonApiRequestBasic<A> {
  resourceConfig: ResourceConfig<T>
  processedFilter?: {[key: string]: {operator: string | null, value: string}[]}
}

export interface JsonApiError {
  status: string
  code: string
  title: string
  detail: string
}

export interface HandlerCallback<R, C = undefined> {
  <R,C>(err?: JsonApiError, result?: R, count?: C): any
  <R>(err?: JsonApiError, result?: R): any
}


export interface SearchFunction<R=any> {
  (request: JsonApiRequest<R>, callback: HandlerCallback<R[], number>): void
}
export interface FindFunction<R=any> {
  (request: JsonApiRequest<R>, callback: HandlerCallback<R>): void
}

export interface CreateFunction<R=any> {
  (request: JsonApiRequest<R>, newResource: R, callback: HandlerCallback<R>): void
}

export interface DeleteFunction<R> {
  (request: JsonApiRequest<R>, callback: HandlerCallback<void>): void
}

export interface UpdateFunction<R=any> {
  (request: JsonApiRequest<R>, newPartialResource: Partial<R>, callback: HandlerCallback<R>): void
}

/**
 * [[include:handlers.md]]
 * @param R type of resource (if unspecified, `any`)
 */
declare class Handler<R=any> {
  constructor(o?: any)
  initialise(resConfig: ResourceConfig<R>): any
  create: CreateFunction<R>
  search: SearchFunction<R>
  find: FindFunction<R>
  update: UpdateFunction<R>
  delete: DeleteFunction<R>
  close: () => any
  ready: boolean
  handlesSort: boolean
  handlesFilter: boolean
}

/**
 * [[include:handlers.md]]
 * @param R type of resource (if unspecified, `any`)
 */
declare class HandlerMisspelled<R=any> {
  constructor(o?: any)
  initialize(resConfig: ResourceConfig<R>): any
  create: CreateFunction<R>
  search: SearchFunction<R>
  find: FindFunction<R>
  update: UpdateFunction<R>
  delete: DeleteFunction<R>
  close: () => any
  ready: boolean
  handlesSort: boolean
  handlesFilter: boolean
}

export type handlerName = "create" | "delete" | "find" | "search" | "update"