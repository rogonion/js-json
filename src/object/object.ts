import type { JsonError } from '@core';
import type { JSONPath, RecursiveDescentSegments } from '@path';
import type { DefaultConverter, Schema } from '@schema';
import type { IfValueFoundInObject } from './core';
import { JSObjectForEach } from './for_each';
import { JSObjectGet } from './get';
import { JSObjectSet } from './set';
import { JSObjectDelete } from './delete';

export class JSObject {
    /**
     * Useful especially with the Set method for creating new nested objects when starting with an empty source.
     */
    private _Schema?: Schema;
    public set Schema(value: Schema | undefined) {
        this._Schema = value;
    }
    public get Schema() {
        return this._Schema;
    }

    /**
     * Result from  {@link JSObject.Get} method.
     */
    private _ValueFound?: any;
    public get ValueFound() {
        return this._ValueFound;
    }
    public set ValueFound(value: any) {
        this._ValueFound = value;
    }

    /**
     * Populated by {@link JSObject.Get}, {@link JSObject.Set}, and {@link JSObject.Delete}.
     */
    private _NoOfResults: number = 0;
    public get NoOfResults() {
        return this._NoOfResults;
    }
    public set NoOfResults(value: number) {
        this._NoOfResults = value;
    }

    /**
     * Last error encountered when processing the source especially for the recursive descent pattern or union pattern in {@link JSONPath}.
     */
    private _LastError?: JsonError;
    public get LastError() {
        return this._LastError;
    }
    public set LastError(value: JsonError | undefined) {
        this._LastError = value;
    }

    /**
     * Root object to work with.
     *
     * Will be modified with {@link JSObject.Set} and {@link JSObject.Delete}.
     */
    private _Source?: any;
    public set Source(value: any | undefined) {
        this._Source = value;
    }
    public get Source() {
        return this._Source;
    }

    private _recursiveDescentSegments: RecursiveDescentSegments = [];
    public set RecursiveDescentSegments(value: RecursiveDescentSegments) {
        this._recursiveDescentSegments = value;
    }
    public get RecursiveDescentSegments() {
        return this._recursiveDescentSegments;
    }

    /**
     * Default converter to use when converting data e.g., valueToSet to the destination type at the {@link JSONPath}.
     */
    private _DefaultConverter?: DefaultConverter;
    public set DefaultConverter(value: DefaultConverter | undefined) {
        this._DefaultConverter = value;
    }
    public get DefaultConverter() {
        return this._DefaultConverter;
    }

    public ForEach(jsonPath: JSONPath, ifValueFoundInObject: IfValueFoundInObject) {
        const forEach = new JSObjectForEach(this, ifValueFoundInObject);
        forEach.ForEach(jsonPath);
    }

    public Get(jsonPath: JSONPath): number {
        const get = new JSObjectGet(this);
        return get.Get(jsonPath);
    }

    public Set(jsonPath: JSONPath, value: any): number {
        const set = new JSObjectSet(this, value);
        return set.Set(jsonPath);
    }

    public Delete(jsonPath: JSONPath): number {
        const deleteObject = new JSObjectDelete(this);
        return deleteObject.Delete(jsonPath);
    }
}
