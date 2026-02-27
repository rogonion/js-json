import type { JsonArray, JsonObject } from './core';

/**
 * Checks if the value is null or undefined.
 */
export function IsNil(v: any): v is null | undefined {
    return v === undefined || v === null;
}

/**
 * Checks if the value is defined (not null and not undefined).
 */
export function IsDefined<T>(v: T | null | undefined): v is T {
    return v !== undefined && v !== null;
}

/**
 * Checks if the value is a string.
 */
export function IsString(v: any): v is string {
    return typeof v === 'string';
}

/**
 * Checks if the value is a number.
 * Note: Returns true for NaN and Infinity. Use Number.isFinite if strict number check is needed.
 */
export function IsNumber(v: any): v is number {
    return typeof v === 'number';
}

/**
 * Checks if the value is a boolean.
 */
export function IsBoolean(v: any): v is boolean {
    return typeof v === 'boolean';
}

/**
 * Checks if the value is an Array.
 */
export function IsArray(v: any): v is JsonArray {
    return Array.isArray(v);
}

/**
 * Checks if the value is a Map.
 */
export function IsMap(v: any): v is Map<any, any> {
    return v instanceof Map;
}

/**
 * Checks if the value is a Set.
 */
export function IsSet(v: any): v is Set<any> {
    return v instanceof Set;
}

/**
 * Checks if the value is a function.
 */
export function IsFunction(v: any): v is Function {
    return typeof v === 'function';
}

/**
 * Checks if the value is a generic object (excluding null).
 * This includes Arrays, Maps, Sets, and plain objects.
 */
export function IsObject(v: any): v is object {
    return typeof v === 'object' && v !== null;
}

/**
 * Checks if the value is a plain JavaScript object (POJO).
 * Excludes Arrays, Maps, Sets, and null.
 */
export function IsPlainObject(v: any): v is JsonObject {
    if (!IsObject(v)) return false;
    const proto = Object.getPrototypeOf(v);
    // Prototype is null (Object.create(null)) or Object.prototype
    return proto === null || proto === Object.prototype;
}
