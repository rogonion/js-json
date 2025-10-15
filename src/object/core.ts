import type {RecursiveDescentSegment, RecursiveDescentSegments} from '@path'
import {Conversion, type Converter} from '@schema'
import {JSONstringify} from '@core'

export abstract class Obj {
    protected _recursiveDescentSegments: RecursiveDescentSegments

    protected _defaultConverter: Converter

    public set defaultConverter(value: Converter) {
        this._defaultConverter = value
    }

    protected constructor(defaultConverter: Converter = new Conversion(), recursiveDescentSegments: RecursiveDescentSegments = []) {
        this._defaultConverter = defaultConverter
        this._recursiveDescentSegments = recursiveDescentSegments
    }

    protected MapKeyString(mapKey: any): string {
        if (typeof mapKey === 'string') {
            return mapKey
        }
        return JSONstringify(mapKey)
    }
}

export abstract class ObjModification extends Obj {
    protected _noOfModifications: number = 0

    protected _lastError?: Error

    protected constructor(defaultConverter: Converter = new Conversion(), recursiveDescentSegments: RecursiveDescentSegments = []) {
        super(defaultConverter, recursiveDescentSegments)
    }
}

export const ObjectErrorCodes = Object.freeze({
    /**
     * General error.
     * */
    ObjectProcessorError: 'object processing failed',

    /**
     * For when a path segment is not found or not expected.
     * */
    PathSegmentInvalid: 'path segment invalid',

    /**
     * For when a value at a path segment is not found or not expected.
     * */
    ValueAtPathSegmentInvalid: 'value at path segment invalid'
})

export type ObjectErrorCode = typeof ObjectErrorCodes[keyof typeof ObjectErrorCodes]

export class ObjectError extends Error {
    public readonly name: string = 'ObjectError'

    public readonly errorCode?: ObjectErrorCode
    public readonly functionName?: string
    public readonly pathSegments?: RecursiveDescentSegment
    public readonly data: any

    constructor(errorCode?: ObjectErrorCode, functionName?: string, message?: string, pathSegments?: RecursiveDescentSegment, data?: any, options?: ErrorOptions) {
        super(message, options)
        this.errorCode = errorCode
        this.functionName = functionName
        this.data = data
        this.pathSegments = pathSegments

        // Set the prototype explicitly. This is crucial for maintaining the
        // correct inheritance chain in older JavaScript environments,
        // though modern Node.js and browsers handle this automatically.
        // It's a good practice for reliability.
        Object.setPrototypeOf(this, ObjectError.prototype)
    }
}