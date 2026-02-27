import { memberDotNotationPatternRegex } from './__internal__';
import type { JSONPath } from './core';

/*
SplitPathSegmentByDotNotationPattern splits a path segment into smaller segments using the dot ('.') delimiter.

This function is typically called after splitting by recursive descent. It respects brackets and quotes,
ensuring that dots inside string literals or bracket notation are not treated as delimiters.
*/
export function SplitPathSegmentByDotNotationPattern(jsonPath: JSONPath): JSONPath[] {
    const dotNotationPaths: JSONPath[] = [];
    const regex = new RegExp(memberDotNotationPatternRegex, 'g');

    const matches: RegExpExecArray[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(jsonPath)) !== null) {
        matches.push(match);
    }

    const memberDotNotationIndexes: [number, number][] = [];
    for (const match of matches) {
        if (match[1]) {
            memberDotNotationIndexes.push([match.index, match.index + match[0].length]);
        }
    }

    if (memberDotNotationIndexes.length > 0) {
        let start = 0;
        for (const index of memberDotNotationIndexes) {
            dotNotationPaths.push(jsonPath.substring(start, index[0]));
            start = index[1];
        }

        if (start !== jsonPath.length) {
            dotNotationPaths.push(jsonPath.substring(start));
        }
    } else {
        dotNotationPaths.push(jsonPath);
    }

    return dotNotationPaths;
}
