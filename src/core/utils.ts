/**
 * Helper function to convert all JavaScript types to json.
 *
 * Adds logic for the following types:
 * * {@link Map}
 * * {@link Set}
 * */
export function JSONstringify(value: any, replacer?: (this: any, key: string, value: any) => any, space?: string | number): string {
    return JSON.stringify(
        value instanceof Map ? Object.fromEntries(value.entries())
            : value instanceof Set ? [...value] : value, replacer, space
    )
}

/**
 * Represents `{}` or user-defined class and is not empty.
 * */
export function IsObjectLiteralAndNotEmpty(v: any): boolean {
    return IsObjectLiteral(v) && Object.keys(v).length > 0
}

/**
 * Represents `{}` or user-defined class whose key is a `string` or coerced to it.
 * */
export function IsObjectLiteral(v: any): boolean {
    return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Map) && !(v instanceof Set)
}

export function IsFunction(v: any): boolean {
    return typeof v === 'function'
}

export function IsArrayAndNotEmpty(v: any): boolean {
    return IsArray(v) && (v as any[]).length > 0
}

export function IsSetAndNotEmpty(v: any): boolean {
    return IsSet(v) && (v as Set<any>).size > 0
}

export function IsSet(v: any): boolean {
    return v instanceof Set
}

export function IsMapAndNotEmpty(v: any): boolean {
    return IsMap(v) && (v as Map<any, any>).size > 0
}

export function IsMap(v: any): boolean {
    return v instanceof Map
}

export function IsArray(v: any): boolean {
    return Array.isArray(v)
}

export function IsNullOrUndefined(v: any): boolean {
    return typeof v === 'undefined' || v === null
}
