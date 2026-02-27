import type { RecursiveDescentSegment } from '@path';

/**
 * IfValueFoundInObject is called when value is found at {@link JSONPath}.
 *
 * Parameters:
 * * jsonPath - Current {@link JSONPath} where value was found.
 * * value - value found.
 *
 * Returns `true` to terminate ForEach loop.
 */
export type IfValueFoundInObject = (jsonPath: RecursiveDescentSegment, value: any) => boolean;

export const JSObjectErrorCodes = {
    ObjectProcessingFailed: 'object processing failed',
    PathSegmentInvalid: 'path segment is invalid',
    ValueAtPathSegmentInvalid: 'value at path segment invalid'
} as const;
export type JSObjectErrorCode = (typeof JSObjectErrorCodes)[keyof typeof JSObjectErrorCodes];
