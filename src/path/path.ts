import {
    CollectionMemberSegment,
    type JSONPath,
    JsonpathDotNotation,
    JsonpathLeftBracket,
    JsonpathRecursiveDescentNotation,
    JsonpathRightBracket,
    type RecursiveDescentSegment,
    type RecursiveDescentSegments
} from './core';
import { ExtractCollectionMemberSegments } from './extract_collection_members_segments';
import { SplitPathByRecursiveDescentPattern } from './split_path_by_recursive_descent_pattern';
import { SplitPathSegmentByDotNotationPattern } from './split_recursive_descent_path_by_member_dot_notation';

/**
 * Parse breaks down a JSONPath string into a structured 2D slice of segments.
 *
 * The parsing process involves:
 * 1. Splitting the path by the recursive descent operator `..`.
 * 2. For each resulting section:
 *
 *      a. Splitting by the dot notation pattern `.`.
 *
 *      b. Extracting individual collection members (brackets, indices, keys).
 *
 * It returns a RecursiveDescentSegments object, which is a 2D slice. The top-level slice
 * represents parts of the path separated by recursive descent, and the inner slice contains
 * the linear sequence of segments.
 * @param jsonPath
 * @returns
 */
export function Parse(jsonPath: JSONPath): RecursiveDescentSegments {
    const recursiveDescentSegments = SplitPathByRecursiveDescentPattern(jsonPath);

    const segments: RecursiveDescentSegments = [];
    for (const recursiveDescentSegment of recursiveDescentSegments) {
        const splitDotNotationSegments = SplitPathSegmentByDotNotationPattern(recursiveDescentSegment);
        let collectionSegments: CollectionMemberSegment[] = [];
        for (const splitDotNotationSegment of splitDotNotationSegments) {
            const res = ExtractCollectionMemberSegments(splitDotNotationSegment);
            collectionSegments = collectionSegments.concat(res);
        }
        segments.push(collectionSegments);
    }

    return segments;
}

export function RecursiveDescentSegmentsToString(n: RecursiveDescentSegments): string {
    const segmentsStr: string[] = [];
    for (const segment of n) {
        const segmentStr = RecursiveDescentSegmentToString(segment);
        if (segmentStr !== '') {
            segmentsStr.push(segmentStr);
        }
    }
    if (segmentsStr.length > 0) {
        return segmentsStr.join(JsonpathRecursiveDescentNotation);
    }
    return '';
}

export function RecursiveDescentSegmentToString(n: RecursiveDescentSegment): string {
    const segmentsStr: string[] = [];
    for (const s of n) {
        const sString = s.toString();
        if (sString.length > 0) {
            segmentsStr.push(sString);
        }
    }
    if (segmentsStr.length > 0) {
        let newPath = segmentsStr[0];
        if (segmentsStr.length > 1) {
            for (let i = 1; i < segmentsStr.length; i++) {
                const segmentStr = segmentsStr[i];
                if (segmentStr.startsWith(JsonpathLeftBracket) && segmentStr.endsWith(JsonpathRightBracket)) {
                    newPath += segmentStr;
                    continue;
                }
                if (!newPath.endsWith(JsonpathDotNotation)) {
                    newPath += JsonpathDotNotation;
                }
                newPath += segmentStr;
                if (i !== segmentsStr.length - 1) {
                    const nextSegmentStr = segmentsStr[i + 1];
                    if (
                        !nextSegmentStr.startsWith(JsonpathLeftBracket) &&
                        !nextSegmentStr.endsWith(JsonpathRightBracket)
                    ) {
                        newPath += JsonpathDotNotation;
                    }
                }
            }
        }
        return newPath;
    }
    return '';
}
