/**
 * @module @jagql/framework
 */
import {Schema as JoiSchema} from 'joi'
import {Handler, HandlerMisspelled} from './Handler'

export type Schema = JoiSchema & {
  _settings?: any
  _type?: any
  uidType?: (type: string) => Schema
}

export type BaseType = {
  id?: string
  type: string
}

export type ResourceAttributes<Item> = {
  [x in keyof Item]: Schema
}

export type OptionalResourceAttributes<Item> = {
  [x in keyof Item]?: Schema
}

type PrimaryKeyType = 'uuid' | 'autoincrement' | 'string'

export interface ResourceConfig<T> {
  namespace?: string,
  description?: string,
  resource: string,
  handlers: Handler | HandlerMisspelled
  primaryKey: PrimaryKeyType,
  attributes: ResourceAttributes<T>
  examples: (BaseType & Partial<T>)[]
  searchParams?: OptionalResourceAttributes<T>
}
