import {
    type CollectionMemberSegment,
    type JSONPath,
    JsonpathDotNotation,
    JsonpathKeyIndexAll,
    JsonpathKeyRoot,
    JsonpathLeftBracket,
    JsonpathRecursiveDescentNotation,
    JsonpathRightBracket,
    type LinearCollectionSelector,
    type RecursiveDescentSegment,
    type RecursiveDescentSegments
} from './core.ts'
import {SplitPathByRecursiveDescentPattern} from './split_path_by_recursive_descent_pattern.ts'
import {SplitPathSegmentByDotNotationPattern} from './split_recursive_descent_path_by_member_dot_notation.ts'
import {ExtractCollectionMemberSegments} from './extract_collection_member_segments.ts'
import {getJsonKey} from './__internal__'

/**
 * Extracts path member segment from path following the JSONPath syntax.
 *
 * Ensure that the path is a valid JSONPath.
 *
 * Splitting is done as follows:
 * 1. Breakdown path using recursive descent pattern.
 * 2. For each recursive descent pattern, breakdown using dot notation pattern followed by bracket notation pattern.
 *
 * @function
 * @param jsonPath - JSONPath.
 * @returns Array of recursive descent path(s) to data. Top level slices represents recursive descent path.
 * */
export function Parse(jsonPath: JSONPath): RecursiveDescentSegments {
    let recursiveDescentSegments = SplitPathByRecursiveDescentPattern(jsonPath)

    let segments: RecursiveDescentSegments = []
    for (const recursiveDescentSegment of recursiveDescentSegments) {
        let splitDotNotationSegments = SplitPathSegmentByDotNotationPattern(recursiveDescentSegment)
        let collectionSegments: RecursiveDescentSegment = []
        for (const splitDotNotationSegment of splitDotNotationSegments) {
            let res = ExtractCollectionMemberSegments(splitDotNotationSegment)
            collectionSegments = [...collectionSegments, ...res]
        }
        segments.push(collectionSegments)
    }

    return segments
}

export function RecursiveDescentSegmentsToString(value: RecursiveDescentSegments): string {
    let segmentsStr: string[] = []
    for (const segment of value) {
        const segmentStr = RecursiveDescentSegmentToString(segment)
        if (segmentStr.length > 0) {
            segmentsStr.push(segmentStr)
        }
    }
    if (segmentsStr.length > 0) {
        return segmentsStr.join(JsonpathRecursiveDescentNotation)
    }
    return ''
}

export function RecursiveDescentSegmentToString(value: RecursiveDescentSegment): string {
    let segmentsStr: string[] = []

    for (const s of value) {
        const sString = CollectionMemberSegmentToString(s)
        if (sString.length > 0) {
            segmentsStr.push(sString)
        }
    }

    if (segmentsStr.length > 0) {
        let newPath = segmentsStr[0]
        if (segmentsStr.length > 1) {
            for (let i = 1; i < segmentsStr.length; i++) {
                const segmentStr = segmentsStr[i]
                if (segmentStr.startsWith(JsonpathLeftBracket) && segmentStr.endsWith(JsonpathRightBracket)) {
                    newPath += segmentStr
                    continue
                }
                if (!newPath.endsWith(JsonpathDotNotation)) {
                    newPath += JsonpathDotNotation
                }
                newPath += segmentStr
                if (i != segmentsStr.length - 1) {
                    let nextSegmentStr = segmentsStr[i + 1]
                    if (!nextSegmentStr.startsWith(JsonpathLeftBracket) && !nextSegmentStr.endsWith(JsonpathRightBracket)) {
                        newPath += JsonpathDotNotation
                    }
                }
            }
        }
        return newPath
    }

    return ''
}

export function CollectionMemberSegmentToString(value: CollectionMemberSegment): string {
    if (!value) {
        return ''
    }

    if (value.IsKey && value.Key) {
        return getJsonKey(value.Key)
    }

    if (value.IsKeyIndexAll) {
        if (value.ExpectAssociative) {
            return JsonpathKeyIndexAll
        }
        return `${JsonpathLeftBracket}${JsonpathKeyIndexAll}${JsonpathRightBracket}`
    }

    if (value.IsKeyRoot) {
        return JsonpathKeyRoot
    }

    if (value.IsIndex && typeof value.Index === 'number') {
        return `${JsonpathLeftBracket}${value.Index}${JsonpathRightBracket}`
    }

    if (value.LinearCollectionSelector) {
        return LinearCollectionSelectorToString(value.LinearCollectionSelector)
    }

    if (Array.isArray(value.UnionSelector) && value.UnionSelector.length > 0) {
        let segmentsStr: string[] = []
        for (const u of value.UnionSelector) {
            let uStr = CollectionMemberSegmentToString(u)
            if (uStr.length > 0) {
                if (uStr.startsWith(JsonpathLeftBracket)) {
                    uStr = uStr.slice(1)
                }
                if (uStr.endsWith(JsonpathRightBracket)) {
                    uStr = uStr.slice(0, uStr.length - 1)
                }
                segmentsStr.push(uStr)
            }
        }
        if (segmentsStr.length > 0) {
            return `${JsonpathLeftBracket}${segmentsStr.join(',')}${JsonpathRightBracket}`
        }
    }

    return ''
}

export function LinearCollectionSelectorToString(value: LinearCollectionSelector): string {
    if (!value) {
        return ''
    }

    let str = JsonpathLeftBracket
    if (value.IsStart && typeof value.Start === 'number') {
        str += `${value.Start}`
    }
    str += ':'
    if (value.IsEnd && typeof value.End === 'number') {
        str += `${value.End}`
    }
    str += ':'
    if (value.IsStep && typeof value.Step === 'number') {
        str += `${value.Step}`
    }
    str += JsonpathRightBracket
    return str
}
