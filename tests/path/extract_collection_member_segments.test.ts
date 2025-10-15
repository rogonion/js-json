import type {TestData} from '@internal'
import {
    CollectionMemberSegment,
    ExtractCollectionMemberSegments,
    type JSONPath,
    JsonpathKeyIndexAll,
    JsonpathKeyRoot,
    LinearCollectionSelector,
    type RecursiveDescentSegment
} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual} from '@object'
import {JSONstringify} from '@core'

describe('extract_collection_member_segments', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Extraction of $Segment should match expected value', (testData) => {
        let result = ExtractCollectionMemberSegments(testData.Segment)

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedSegments)).toBe(true)
        } catch (e) {
            console.log(
                'expected=', JSONstringify(testData.ExpectedSegments), '\n',
                'got=', JSONstringify(result), '\n',
                'Segments=', testData.Segment
            )
            throw e
        }
    })
})

interface ExtractCollectionMemberSegmentsData extends TestData {
    Segment: JSONPath
    ExpectedSegments: RecursiveDescentSegment
}

const TestData: ExtractCollectionMemberSegmentsData[] = [
    {
        Segment: 'storebicycle[\'item-code\']',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('storebicycle')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey('item-code')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: '[\'total.sum\']',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('total.sum')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: '$[\'report-data\']',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey(JsonpathKeyRoot)
                .WithIsKeyRoot(true)
                .WithExpectLinear(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey('report-data')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: 'widow[::2][4:5:]',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('widow')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithLinearCollectionSelector(
                    LinearCollectionSelector.create()
                        .WithStep(2)
                        .WithIsStep(true)
                        .build()
                )
                .WithExpectLinear(true)
                .build(),
            CollectionMemberSegment.create()
                .WithLinearCollectionSelector(
                    LinearCollectionSelector.create()
                        .WithStart(4)
                        .WithIsStart(true)
                        .WithEnd(5)
                        .WithIsEnd(true)
                        .build()
                )
                .WithExpectLinear(true)
                .build()
        ]
    },
    {
        Segment: 'transactions[1:5:2]',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('transactions')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithLinearCollectionSelector(
                    LinearCollectionSelector.create()
                        .WithStart(1)
                        .WithIsStart(true)
                        .WithEnd(5)
                        .WithIsEnd(true)
                        .WithStep(2)
                        .WithIsStep(true)
                        .build()
                )
                .WithExpectLinear(true)
                .build()
        ]
    },
    {
        Segment: `preferences['theme-settings',"font-size",3]`,
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('preferences')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithUnionSelector([
                    CollectionMemberSegment.create()
                        .WithKey('theme-settings')
                        .WithIsKey(true)
                        .build(),
                    CollectionMemberSegment.create()
                        .WithKey('font-size')
                        .WithIsKey(true)
                        .build(),
                    CollectionMemberSegment.create()
                        .WithIndex(3)
                        .WithIsIndex(true)
                        .build()
                ])
                .WithExpectLinear(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: '[\'1st_category\']',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('1st_category')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: 'products[\'item-details..\']',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('products')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey('item-details..')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: '$[\'user info\'][\'address.wind\'][1]',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey(JsonpathKeyRoot)
                .WithIsKeyRoot(true)
                .WithExpectLinear(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey('user info')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey('address.wind')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithIndex(1)
                .WithIsIndex(true)
                .WithExpectLinear(true)
                .build()
        ]
    },
    {
        Segment: 'data[*]',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('data')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey(JsonpathKeyIndexAll)
                .WithIsKeyIndexAll(true)
                .WithExpectAssociative(true)
                .WithExpectLinear(true)
                .build()
        ]
    },
    {
        Segment: 'bicycle[\'item-code\']',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('bicycle')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithKey('item-code')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build()
        ]
    },
    {
        Segment: 'book[0]',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey('book')
                .WithIsKey(true)
                .WithExpectAssociative(true)
                .build(),
            CollectionMemberSegment.create()
                .WithIndex(0)
                .WithIsIndex(true)
                .WithExpectLinear(true)
                .build()
        ]
    },
    {
        Segment: '$',
        ExpectedSegments: [
            CollectionMemberSegment.create()
                .WithKey(JsonpathKeyRoot)
                .WithIsKeyRoot(true)
                .WithExpectLinear(true)
                .WithExpectAssociative(true)
                .build()
        ]
    }
]