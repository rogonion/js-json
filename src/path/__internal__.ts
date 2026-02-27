/**
 * Formats a string key for JSONPath output.
 *
 * It returns the key as-is if it's a valid identifier, otherwise wraps it in brackets and quotes.
 *
 * Examples:
 * * "name" -> "name
 * * "first-name" -> "['first-name']"
 */
export function getJsonKey(value: string): string {
    if (jsonKeyBeginDoesNotNeedBracketsRegex.test(value)) {
        if (!jsonKeyRemainingNeedBracketsRegex.test(value)) {
            return value;
        }
    }
    return `['${value}']`;
}

/**
 * Matches keys starting with a letter.
 */
export const jsonKeyBeginDoesNotNeedBracketsRegex = /^[a-zA-Z]/;

/**
 * Matches keys containing characters that require brackets.
 */
export const jsonKeyRemainingNeedBracketsRegex = /[^a-zA-Z0-9_]/;

/**
 * Matches individual members inside a union selector (integers or quoted strings).
 */
export const unionMemberPatternRegex = /(\d+)|["']([^"']+)["']/;

/**
 * Matches the array slice syntax start:end:step.
 */
export const arraySelectorPatternRegex = /(\d*):(\d*):(\d*)/;

/**
 * Matches various forms of path segments (index, slice, quoted key, union, simple key).
 */
export const collectionMemberSegmentPatternRegex =
    /\[(\d+|\*)]|\[(\d*:\d*:\d*)]|\[["']([^"']+)["']]|\[((?:[^,\n]+,?)+)]|([a-zA-Z0-9$*_]+)/;

/**
 * Matches segments separated by `..`.
 */
export const recursiveDescentPatternRegex = /\[(?:["'][^"']+["']|[^]])+]|([.]{2})/;

export const memberDotNotationPatternRegex = /\[(?:["'][^"']+["']|[^]])+]|([.])/;
