import type {JSONPath} from './core.ts'
import {recursiveDescentPatternRegex} from './__internal__'

export function SplitPathByRecursiveDescentPattern(jsonPath: JSONPath): JSONPath[] {
    const matches = jsonPath.matchAll(recursiveDescentPatternRegex)

    let recursiveDescentPaths: string[] = []
    let recursiveDescentIndexes: number[][] = []

    for (const match of matches) {
        if (match[1] == '..') {
            recursiveDescentIndexes.push([match.index, match.index + match[1].length])
        }
    }
    if (recursiveDescentIndexes.length > 0) {
        let start = 0
        for (const recursiveDescentIndex of recursiveDescentIndexes) {
            recursiveDescentPaths.push(jsonPath.slice(start, recursiveDescentIndex[0]))
            start = recursiveDescentIndex[1]
        }

        if (start != jsonPath.length) {
            recursiveDescentPaths.push(jsonPath.slice(start))
        }
    } else {
        recursiveDescentPaths.push(jsonPath)
    }

    return recursiveDescentPaths
}