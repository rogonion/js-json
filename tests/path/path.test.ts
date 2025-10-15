import type {TestData} from '@internal'
import {
    CollectionMemberSegment,
    type JSONPath,
    JsonpathKeyIndexAll,
    JsonpathKeyRoot,
    LinearCollectionSelector,
    Parse,
    type RecursiveDescentSegments,
    RecursiveDescentSegmentsToString
} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual} from '@object'
import {JSONstringify} from '@core'

describe('parsed to string', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Expects $Path to be returned', (testData) => {
        let result = RecursiveDescentSegmentsToString(Parse(testData.Path))

        try {
            expect(areEqual.AreEqual(result, testData.Path)).toBe(true)
        } catch (e) {
            console.log(
                'expected=', testData.Path, '\n',
                'got=', result, '\n'
            )
            throw e
        }
    })
})

describe('parse', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Extraction of $Path should match expected value', (testData) => {
        let result = Parse(testData.Path)

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedPathSegment)).toBe(true)
        } catch (e) {
            console.log(
                'expected=', JSONstringify(testData.ExpectedPathSegment), '\n',
                'got=', JSONstringify(result), '\n',
                'Segments=', testData.Path
            )
            throw e
        }
    })
})

interface ParseData extends TestData {
    Path: JSONPath
    ExpectedPathSegment: RecursiveDescentSegments
}

const TestData: ParseData[] = [
    {
        Path: '$[1,3,5]',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithUnionSelector([
                        CollectionMemberSegment.create()
                            .WithIndex(1)
                            .WithIsIndex(true)
                            .build(),
                        CollectionMemberSegment.create()
                            .WithIndex(3)
                            .WithIsIndex(true)
                            .build(),
                        CollectionMemberSegment.create()
                            .WithIndex(5)
                            .WithIsIndex(true)
                            .build()
                    ])
                    .WithExpectLinear(true)
                    .WithExpectAssociative(true)
                    .build()
            ]
        ]
    },
    {
        Path: '$[\'report-data\']..[\'total.sum\']',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('report-data')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build()
            ],
            [
                CollectionMemberSegment.create()
                    .WithKey('total.sum')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build()
            ]
        ]
    },
    {
        Path: '$[\'report-data\']..[\'total.sum\']',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('report-data')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build()
            ],
            [
                CollectionMemberSegment.create()
                    .WithKey('total.sum')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build()
            ]
        ]
    },
    {
        Path: '$.transactions[1:5:2].*',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build(),
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
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyIndexAll)
                    .WithIsKeyIndexAll(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build()
            ]
        ]
    },
    {
        Path: '$.data.user.preferences[\'theme-settings\',\'font-size\']',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('data')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('user')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build(),
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
                            .build()
                    ])
                    .WithExpectLinear(true)
                    .WithExpectAssociative(true)
                    .build()
            ]
        ]
    },
    {
        Path: '$..[\'1st_category\'].name',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build()
            ],
            [
                CollectionMemberSegment.create()
                    .WithKey('1st_category')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('name')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build()
            ]
        ]
    },
    {
        Path: '$.products[\'item-details\'].dimensions[0].width',
        ExpectedPathSegment: [
            [
                CollectionMemberSegment.create()
                    .WithKey(JsonpathKeyRoot)
                    .WithIsKeyRoot(true)
                    .WithExpectAssociative(true)
                    .WithExpectLinear(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('products')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('item-details')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('dimensions')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithIndex(0)
                    .WithIsIndex(true)
                    .WithExpectLinear(true)
                    .build(),
                CollectionMemberSegment.create()
                    .WithKey('width')
                    .WithIsKey(true)
                    .WithExpectAssociative(true)
                    .build()
            ]
        ]
    }
]