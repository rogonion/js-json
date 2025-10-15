import type {TestData} from '@internal'
import {type JSONPath, SplitPathByRecursiveDescentPattern} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual} from '@object'

describe('split_path_by_recursive_descent_pattern', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Extraction of $Path should match expected value', (testData) => {
        let result = SplitPathByRecursiveDescentPattern(testData.Path)

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedSegments)).toBe(true)
        } catch (e) {
            console.log(
                'expected=', testData.ExpectedSegments, '\n',
                'got=', result, '\n',
                'Path=', testData.Path
            )
            throw e
        }
    })
})

interface SplitPathByRecursiveDescentPatternData extends TestData {
    Path: JSONPath
    ExpectedSegments: JSONPath[]
}

const TestData: SplitPathByRecursiveDescentPatternData[] = [
    {
        Path: '$.store.book[0].title',
        ExpectedSegments: ['$.store.book[0].title']
    },
    {
        Path: '$..author',
        ExpectedSegments: ['$', 'author']
    },
    {
        Path: '$.store.bicycle[\'item-code\']',
        ExpectedSegments: ['$.store.bicycle[\'item-code\']']
    },
    {
        Path: '$.data[*].price',
        ExpectedSegments: ['$.data[*].price']
    },
    {
        Path: '$[\'user info\'][\'address.wind\'][1].street',
        ExpectedSegments: ['$[\'user info\'][\'address.wind\'][1].street']
    },
    {
        Path: '$.products[\'item-details..\'].dimensions[0].width.dimensions[2][3].width',
        ExpectedSegments: ['$.products[\'item-details..\'].dimensions[0].width.dimensions[2][3].width']
    },
    {
        Path: '$..[\'1st_category\'].name',
        ExpectedSegments: ['$', '[\'1st_category\'].name']
    },
    {
        Path: `$.data.user.preferences['theme-settings',"font-size",3]`,
        ExpectedSegments: [`$.data.user.preferences['theme-settings',"font-size",3]`]
    },
    {
        Path: '$.transactions[1:5:2].amount',
        ExpectedSegments: ['$.transactions[1:5:2].amount']
    },
    {
        Path: '$[\'report-data\']..[\'total.sum\']..store.bicycle[\'item-code\']',
        ExpectedSegments: ['$[\'report-data\']', '[\'total.sum\']', 'store.bicycle[\'item-code\']']
    },
    {
        Path: '$[\'report-data\']..[\'total.sum..()&^\']..store.bicycle[\'item-code\']',
        ExpectedSegments: ['$[\'report-data\']', '[\'total.sum..()&^\']', 'store.bicycle[\'item-code\']']
    }
]