export function getJsonKey(value: string): string {
    if (jsonKeyBeginDoesNotNeedBracketsRegex.test(value)) {
        if (!jsonKeyRemainingNeedBracketsRegex.test(value)) {
            return value
        }
    }
    return `['${value}']`
}

export const jsonKeyBeginDoesNotNeedBracketsRegex = /^[a-zA-Z]/

export const jsonKeyRemainingNeedBracketsRegex = /[^a-zA-Z0-9_]/

export const unionMemberPatternRegex = /(\d+)|["']([^"']+)["']/g

export const arraySelectorPatternRegex = /(\d*):(\d*):(\d*)/

export const collectionMemberSegmentPatternRegex = /\[(\d+|\*)]|\[(\d*:\d*:\d*)]|\[["']([^"']+)["']]|\[((?:[^,\n]+,?)+)]|([a-zA-Z0-9$*_]+)/g

export const recursiveDescentPatternRegex = /\[(?:["'][^"']+["']|[^]])+]|([.]{2})/g

export const memberDotNotationPatternRegex = /\[(?:["'][^"']+["']|[^]])+]|([.])/g