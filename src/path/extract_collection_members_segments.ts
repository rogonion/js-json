import {
    CollectionMemberSegment,
    type JSONPath,
    JsonpathKeyIndexAll,
    JsonpathKeyRoot,
    LinearCollectionSelector,
    type RecursiveDescentSegment
} from './core';
import {
    arraySelectorPatternRegex,
    collectionMemberSegmentPatternRegex,
    unionMemberPatternRegex
} from './__internal__';

/**
 * Parses a single JSONPath segment string into a structured RecursiveDescentSegment.
 *
 * It identifies and extracts various selector types such as indices (`[1]`), wildcards (`[*]`), slices (`[1:5]`), unions (`['a','b']`), and standard keys.
 * @param jsonPath
 * @returns
 */
export function ExtractCollectionMemberSegments(jsonPath: JSONPath): RecursiveDescentSegment {
    const collectionMemberSegments: RecursiveDescentSegment = [];

    const regex = new RegExp(collectionMemberSegmentPatternRegex, 'g');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(jsonPath)) !== null) {
        let segment: string = '';
        let groupIndex = 0;

        // Identify which group matched based on the regex structure in __internal__.ts
        // Group 1: Index/Wildcard [1] or [*]
        if (match[1] !== undefined) {
            segment = match[1];
            groupIndex = 1;
        }
        // Group 2: Slice [1:5:2]
        else if (match[2] !== undefined) {
            segment = match[2];
            groupIndex = 2;
        }
        // Group 3: Quoted Key ['key']
        else if (match[3] !== undefined) {
            segment = match[3];
            groupIndex = 3;
        }
        // Group 4: Union ['a', 1]
        else if (match[4] !== undefined) {
            segment = match[4];
            groupIndex = 4;
        }
        // Group 5: Simple Key / Root / Wildcard
        else if (match[5] !== undefined) {
            segment = match[5];
            groupIndex = 5;
        }

        if (groupIndex === 0 || segment === '') {
            continue;
        }

        const collectionMemberSegment = new CollectionMemberSegment();

        switch (groupIndex) {
            case 1: // [1] or [*]
                {
                    const index = parseInt(segment, 10);
                    // Ensure it is a strict integer match to mimic Go's Atoi
                    if (!isNaN(index) && String(index) === segment) {
                        collectionMemberSegment.Index = index;
                        collectionMemberSegment.ExpectLinear = true;
                    } else {
                        collectionMemberSegment.Key = segment;
                        collectionMemberSegment.IsKeyIndexAll = true;
                        collectionMemberSegment.ExpectAssociative = true;
                        collectionMemberSegment.ExpectLinear = true;
                    }
                }
                break;
            case 2: // [1:5:2]
                {
                    const startEndStepMatch = segment.match(arraySelectorPatternRegex);
                    if (!startEndStepMatch) break;

                    // Check if any of the groups (1, 2, 3) are non-empty
                    let sesAvailable = false;
                    for (let i = 1; i <= 3; i++) {
                        if (startEndStepMatch[i] && startEndStepMatch[i].length > 0) {
                            sesAvailable = true;
                            break;
                        }
                    }

                    if (!sesAvailable) {
                        collectionMemberSegment.Key = JsonpathKeyIndexAll;
                        collectionMemberSegment.IsKeyIndexAll = true;
                        collectionMemberSegment.ExpectAssociative = true;
                        collectionMemberSegment.ExpectLinear = true;
                    } else {
                        collectionMemberSegment.LinearCollectionSelector = new LinearCollectionSelector();

                        if (startEndStepMatch[1] && startEndStepMatch[1].length > 0) {
                            collectionMemberSegment.LinearCollectionSelector.Start = parseInt(startEndStepMatch[1], 10);
                        }
                        if (startEndStepMatch[2] && startEndStepMatch[2].length > 0) {
                            collectionMemberSegment.LinearCollectionSelector.End = parseInt(startEndStepMatch[2], 10);
                        }
                        if (startEndStepMatch[3] && startEndStepMatch[3].length > 0) {
                            collectionMemberSegment.LinearCollectionSelector.Step = parseInt(startEndStepMatch[3], 10);
                        }
                        collectionMemberSegment.ExpectLinear = true;
                    }
                }
                break;
            case 3: // ['key']
                {
                    collectionMemberSegment.Key = segment;
                    collectionMemberSegment.ExpectAssociative = true;
                }
                break;
            case 4: // Union
                {
                    const unionRegex = new RegExp(unionMemberPatternRegex, 'g');
                    const unionSelector: CollectionMemberSegment[] = [];
                    let umm: RegExpExecArray | null;

                    while ((umm = unionRegex.exec(segment)) !== null) {
                        // umm[1] digits, umm[2] quoted string
                        if (umm[1] !== undefined) {
                            const index = parseInt(umm[1], 10);
                            if (!isNaN(index)) {
                                const s = new CollectionMemberSegment();
                                s.Index = index;
                                unionSelector.push(s);
                            }
                        } else if (umm[2] !== undefined) {
                            const s = new CollectionMemberSegment();
                            s.Key = umm[2];
                            unionSelector.push(s);
                        }
                    }

                    if (unionSelector.length > 0) {
                        collectionMemberSegment.UnionSelector = unionSelector;
                        collectionMemberSegment.ExpectAssociative = true;
                        collectionMemberSegment.ExpectLinear = true;
                    }
                }
                break;
            case 5: // Simple Key
                {
                    if (segment === JsonpathKeyIndexAll) {
                        collectionMemberSegment.Key = segment;
                        collectionMemberSegment.IsKeyIndexAll = true;
                        collectionMemberSegment.ExpectAssociative = true;
                    } else if (segment === JsonpathKeyRoot) {
                        collectionMemberSegment.Key = segment;
                        collectionMemberSegment.IsKeyRoot = true;
                        collectionMemberSegment.ExpectAssociative = true;
                        collectionMemberSegment.ExpectLinear = true;
                    } else {
                        collectionMemberSegment.Key = segment;
                        collectionMemberSegment.ExpectAssociative = true;
                    }
                }
                break;
        }

        collectionMemberSegments.push(collectionMemberSegment);
    }

    return collectionMemberSegments;
}
