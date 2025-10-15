import type {TestData} from '@internal'
import {type JSONPath, SplitPathSegmentByDotNotationPattern} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual} from '@object'

describe('split_recursive_descent_path_by_member_dot_notation', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Extraction of $Segment should match expected value', (testData) => {
        let result = SplitPathSegmentByDotNotationPattern(testData.Segment)

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedSegments)).toBe(true)
        } catch (e) {
            console.log(
                'expected=', testData.ExpectedSegments, '\n',
                'got=', result, '\n',
                'Segment=', testData.Segment
            )
            throw e
        }
    })
})

interface SplitRecursiveDescentPathByMemberDotNotationPatternData extends TestData {
    Segment: JSONPath
    ExpectedSegments: JSONPath[]
}

const TestData: SplitRecursiveDescentPathByMemberDotNotationPatternData[] = [
    {
        Segment:          "$.store.book[0].title",
        ExpectedSegments: ["$", "store", "book[0]", "title"],
    },
    {
        Segment:          "$",
        ExpectedSegments: ["$"],
    },
    {
        Segment:          "author",
        ExpectedSegments: ["author"],
    },
    {
        Segment:          "$.store.bicycle['item-code']",
        ExpectedSegments: ["$", "store", "bicycle['item-code']"],
    },
    {
        Segment:          "$.data[*].price",
        ExpectedSegments: ["$", "data[*]", "price"],
    },
    {
        Segment:          "$['user info']['address.wind'][1].street",
        ExpectedSegments: ["$['user info']['address.wind'][1]", "street"],
    },
    {
        Segment:          "$.products['item-details..'].dimensions[0].width.dimensions[2][3].width",
        ExpectedSegments: ["$", "products['item-details..']", "dimensions[0]", "width", "dimensions[2][3]", "width"],
    },
    {
        Segment:          "['1st_category'].name",
        ExpectedSegments: ["['1st_category']", "name"],
    },
    {
        Segment:          "$.data.user.preferences['theme-settings','font-size',3]",
        ExpectedSegments: ["$", "data", "user", "preferences['theme-settings','font-size',3]"],
    },
    {
        Segment:          "$.transactions[1:5:2].amount",
        ExpectedSegments: ["$", "transactions[1:5:2]", "amount"],
    },
    {
        Segment:          "$['report-data']",
        ExpectedSegments: ["$['report-data']"],
    },
    {
        Segment:          "['total.sum']",
        ExpectedSegments: ["['total.sum']"],
    },
    {
        Segment:          "store.bicycle['item-code']",
        ExpectedSegments: ["store", "bicycle['item-code']"],
    },
    {
        Segment:          "['total.sum..()&^']",
        ExpectedSegments: ["['total.sum..()&^']"],
    }
]