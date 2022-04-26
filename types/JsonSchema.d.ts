/**
 * This file is not normative - it just summarises the JSON-Schema types in use.
 */

/**
 *
 */
export interface JsonSchemaBase {
    type: string
    description: string
}

/**
 *
 */
export interface JsonSchemaArray extends JsonSchemaBase {
    type: "array"
    items?: JsonSchema
}

/**
 *
 */
export interface JsonSchemaString extends JsonSchemaBase {
    type: "string"
    format?: string
}

/**
 *
 */
export interface JsonSchemaObject extends JsonSchemaBase {
    type: "object"
    required?: string[]
    properties?: {[key: string]: JsonSchema}
}

/**
 *
 */
export type JsonSchema = JsonSchemaArray | JsonSchemaObject | JsonSchemaString