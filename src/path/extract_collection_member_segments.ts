import {
    CollectionMemberSegment,
    CollectionMemberSegmentBuilder,
    type JSONPath,
    JsonpathKeyIndexAll,
    JsonpathKeyRoot,
    LinearCollectionSelector,
    type RecursiveDescentSegment
} from './core.ts'
import {arraySelectorPatternRegex, collectionMemberSegmentPatternRegex, unionMemberPatternRegex} from './__internal__'

export function ExtractCollectionMemberSegments(jsonPath: JSONPath): RecursiveDescentSegment {
    let collectionMemberSegments: RecursiveDescentSegment = []

    const matches = jsonPath.matchAll(collectionMemberSegmentPatternRegex)

    for (const match of matches) {
        for (let j = 0; j < match.length; j++) {
            const segment = match[j]

            if (!segment) {
                continue
            }

            let collectionMemberSegmentBuilder: CollectionMemberSegmentBuilder | undefined

            switch (j) {
                case 1: // E.g. [1] , [*]
                    collectionMemberSegmentBuilder = CollectionMemberSegment.create()
                    const index = Number(segment)
                    if (Number.isNaN(index)) {
                        collectionMemberSegmentBuilder.Key = segment
                        collectionMemberSegmentBuilder.IsKeyIndexAll = true
                        collectionMemberSegmentBuilder.ExpectLinear = true
                        collectionMemberSegmentBuilder.ExpectAssociative = true
                    } else {
                        collectionMemberSegmentBuilder.Index = index
                        collectionMemberSegmentBuilder.IsIndex = true
                        collectionMemberSegmentBuilder.ExpectLinear = true
                    }
                    break
                case 2: // E.g. [1:5:2] , [1::]
                    let startEndStepMatch = segment.match(arraySelectorPatternRegex)
                    if (!startEndStepMatch) {
                        break
                    }

                    let sesAvailable = false
                    collectionMemberSegmentBuilder = CollectionMemberSegment.create()
                    for (const ses of startEndStepMatch) {
                        if (ses.length > 0) {
                            sesAvailable = true
                            break
                        }
                    }

                    if (!sesAvailable) {
                        collectionMemberSegmentBuilder.Key = JsonpathKeyIndexAll
                        collectionMemberSegmentBuilder.IsKeyIndexAll = true
                        collectionMemberSegmentBuilder.ExpectLinear = true
                        collectionMemberSegmentBuilder.ExpectAssociative = true
                    } else {
                        const LinearCollectionSelectorBuilder = LinearCollectionSelector.create()
                        let index: number
                        if (startEndStepMatch[1]) {
                            let index = Number(startEndStepMatch[1])
                            if (!Number.isNaN(index)) {
                                LinearCollectionSelectorBuilder.Start = index
                                LinearCollectionSelectorBuilder.IsStart = true
                            }
                        }
                        if (startEndStepMatch[2]) {
                            index = Number(startEndStepMatch[2])
                            if (!Number.isNaN(index)) {
                                LinearCollectionSelectorBuilder.End = index
                                LinearCollectionSelectorBuilder.IsEnd = true
                            }
                        }
                        if (startEndStepMatch[3]) {
                            index = Number(startEndStepMatch[3])
                            if (!Number.isNaN(index)) {
                                LinearCollectionSelectorBuilder.Step = index
                                LinearCollectionSelectorBuilder.IsStep = true
                            }
                        }
                        collectionMemberSegmentBuilder.LinearCollectionSelector = LinearCollectionSelectorBuilder.build()
                        collectionMemberSegmentBuilder.ExpectLinear = true
                    }
                    break
                case 3: // E.g. ['report-data'] , ["reach..records"]
                    collectionMemberSegmentBuilder = CollectionMemberSegment.create()
                    collectionMemberSegmentBuilder.Key = segment
                    collectionMemberSegmentBuilder.IsKey = true
                    collectionMemberSegmentBuilder.ExpectAssociative = true
                    break
                case 4: // E.g. ['theme-settings',"font-size",3]
                    const unionMemberMatch = segment.matchAll(unionMemberPatternRegex)
                    if (!unionMemberMatch) {
                        break
                    }

                    collectionMemberSegmentBuilder = CollectionMemberSegment.create()
                    collectionMemberSegmentBuilder.UnionSelector = []

                    for (const umm of unionMemberMatch) {
                        for (let ummIndex = 0; ummIndex < umm.length; ummIndex++) {
                            const ummSegment = umm[ummIndex]
                            if (!ummSegment) {
                                continue
                            }

                            switch (ummIndex) {
                                case 1:
                                    let index = Number(ummSegment)
                                    if (!Number.isNaN(index)) {
                                        collectionMemberSegmentBuilder.UnionSelector.push(
                                            CollectionMemberSegment.create()
                                                .WithIndex(index)
                                                .WithIsIndex(true)
                                                .build()
                                        )
                                    }
                                    break
                                case 2:
                                    collectionMemberSegmentBuilder.UnionSelector.push(
                                        CollectionMemberSegment.create()
                                            .WithKey(ummSegment)
                                            .WithIsKey(true)
                                            .build()
                                    )
                            }
                        }
                    }

                    collectionMemberSegmentBuilder.ExpectAssociative = true
                    collectionMemberSegmentBuilder.ExpectLinear = true
                    break
                case 5: // E.g. _threeFour5 , *
                    collectionMemberSegmentBuilder = CollectionMemberSegment.create()
                    if (segment == JsonpathKeyIndexAll) {
                        collectionMemberSegmentBuilder.Key = segment
                        collectionMemberSegmentBuilder.IsKeyIndexAll = true
                        collectionMemberSegmentBuilder.ExpectAssociative = true
                        collectionMemberSegmentBuilder.ExpectLinear = true
                    } else if (segment == JsonpathKeyRoot) {
                        collectionMemberSegmentBuilder.Key = segment
                        collectionMemberSegmentBuilder.IsKeyRoot = true
                        collectionMemberSegmentBuilder.ExpectAssociative = true
                        collectionMemberSegmentBuilder.ExpectLinear = true
                    } else {
                        collectionMemberSegmentBuilder.Key = segment
                        collectionMemberSegmentBuilder.IsKey = true
                        collectionMemberSegmentBuilder.ExpectAssociative = true
                    }
                    break
                default:
                    break
            }

            if (collectionMemberSegmentBuilder) {
                collectionMemberSegments.push(collectionMemberSegmentBuilder.build())
            }
        }
    }

    return collectionMemberSegments
}