import { describe, it, expect } from 'vitest';
import {
    IsArray,
    IsBoolean,
    IsDefined,
    IsFunction,
    IsMap,
    IsNil,
    IsNumber,
    IsObject,
    IsPlainObject,
    IsSet,
    IsString
} from '@core';

describe('Core Checks', () => {
    it('IsNil should identify null and undefined', () => {
        expect(IsNil(null)).toBe(true);
        expect(IsNil(undefined)).toBe(true);
        expect(IsNil(0)).toBe(false);
        expect(IsNil('')).toBe(false);
        expect(IsNil(false)).toBe(false);
    });

    it('IsDefined should identify non-nil values', () => {
        expect(IsDefined(0)).toBe(true);
        expect(IsDefined('')).toBe(true);
        expect(IsDefined(false)).toBe(true);
        expect(IsDefined(null)).toBe(false);
        expect(IsDefined(undefined)).toBe(false);
    });

    it('IsString should identify strings', () => {
        expect(IsString('hello')).toBe(true);
        expect(IsString('')).toBe(true);
        expect(IsString(123)).toBe(false);
    });

    it('IsNumber should identify numbers', () => {
        expect(IsNumber(123)).toBe(true);
        expect(IsNumber(0)).toBe(true);
        expect(IsNumber(-1.5)).toBe(true);
        expect(IsNumber(NaN)).toBe(true); // JS typeof NaN is number
        expect(IsNumber('123')).toBe(false);
    });

    it('IsBoolean should identify booleans', () => {
        expect(IsBoolean(true)).toBe(true);
        expect(IsBoolean(false)).toBe(true);
        expect(IsBoolean(0)).toBe(false);
    });

    it('IsArray should identify arrays', () => {
        expect(IsArray([])).toBe(true);
        expect(IsArray([1, 2])).toBe(true);
        expect(IsArray({})).toBe(false);
    });

    it('IsMap should identify Maps', () => {
        expect(IsMap(new Map())).toBe(true);
        expect(IsMap(new Set())).toBe(false);
        expect(IsMap({})).toBe(false);
    });

    it('IsSet should identify Sets', () => {
        expect(IsSet(new Set())).toBe(true);
        expect(IsSet(new Map())).toBe(false);
        expect(IsSet([])).toBe(false);
    });

    it('IsFunction should identify functions', () => {
        expect(IsFunction(() => {})).toBe(true);
        expect(IsFunction(function () {})).toBe(true);
        expect(IsFunction({})).toBe(false);
    });

    it('IsObject should identify any object type excluding null', () => {
        expect(IsObject({})).toBe(true);
        expect(IsObject([])).toBe(true);
        expect(IsObject(new Map())).toBe(true);
        expect(IsObject(new Set())).toBe(true);
        expect(IsObject(null)).toBe(false);
        expect(IsObject(undefined)).toBe(false);
        expect(IsObject('string')).toBe(false);
    });

    it('IsPlainObject should identify simple objects', () => {
        expect(IsPlainObject({})).toBe(true);
        expect(IsPlainObject({ a: 1 })).toBe(true);
        expect(IsPlainObject(Object.create(null))).toBe(true);

        expect(IsPlainObject([])).toBe(false);
        expect(IsPlainObject(new Map())).toBe(false);
        expect(IsPlainObject(new Set())).toBe(false);
        expect(IsPlainObject(null)).toBe(false);

        class Foo {}
        expect(IsPlainObject(new Foo())).toBe(false);
    });
});
