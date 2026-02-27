import { recursiveDescentPatternRegex } from './__internal__';
import type { JSONPath } from './core';

/*
SplitPathByRecursiveDescentPattern splits a JSONPath string into a slice of JSONPath strings
using the recursive descent operator ('..') as the delimiter.

It respects brackets and quotes, ensuring that '..' inside string literals is not treated as a delimiter.
*/
export function SplitPathByRecursiveDescentPattern(jsonPath: JSONPath): JSONPath[] {
    const matches: RegExpExecArray[] = [];
    const regex = new RegExp(recursiveDescentPatternRegex, 'g');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(jsonPath)) !== null) {
        matches.push(match);
    }

    const recursiveDescentIndexes: [number, number][] = [];
    for (const match of matches) {
        // The capturing group's indices are at positions 2 and 3 in Go (which corresponds to group 1 here)
        if (match[1]) {
            recursiveDescentIndexes.push([match.index, match.index + match[0].length]);
        }
    }

    const recursiveDescentPaths: JSONPath[] = [];

    if (recursiveDescentIndexes.length > 0) {
        let start = 0;
        for (const recursiveDescentIndex of recursiveDescentIndexes) {
            recursiveDescentPaths.push(jsonPath.substring(start, recursiveDescentIndex[0]));
            start = recursiveDescentIndex[1];
        }

        if (start !== jsonPath.length) {
            recursiveDescentPaths.push(jsonPath.substring(start));
        }
    } else {
        recursiveDescentPaths.push(jsonPath);
    }

    return recursiveDescentPaths;
}
