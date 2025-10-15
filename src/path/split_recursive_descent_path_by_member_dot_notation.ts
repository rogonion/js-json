import type {JSONPath} from './core.ts'
import {memberDotNotationPatternRegex} from './__internal__'

export function SplitPathSegmentByDotNotationPattern(jsonPath: JSONPath): JSONPath[] {
    let dotNotationPaths: JSONPath[] = []

    let matches = jsonPath.matchAll(memberDotNotationPatternRegex)

    let memberDotNotationIndexes: number[][] = []
    for (const match of matches) {
        if (match[1] == '.') {
            memberDotNotationIndexes.push([match.index, match.index + match[1].length])
        }
    }

    if (memberDotNotationIndexes.length > 0) {
        let start = 0
        for (const memberDotNotationIndex of memberDotNotationIndexes) {
            dotNotationPaths.push(jsonPath.slice(start, memberDotNotationIndex[0]))
            start = memberDotNotationIndex[1]
        }

        if (start != jsonPath.length) {
            dotNotationPaths.push(jsonPath.slice(start))
        }
    } else {
        dotNotationPaths.push(jsonPath)
    }

    return dotNotationPaths
}