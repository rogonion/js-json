import { TestData } from '@internal';
import { AreEqual } from '@object';
import { type JSONPath, SplitPathByRecursiveDescentPattern } from '@path';
import { describe, expect, it } from 'vitest';

describe('split_path_by_recursive_descent_pattern', () => {
    const areEqual = new AreEqual();

    it.each(testData)('Splitting of $Path should match expected value', (testData) => {
        let result = SplitPathByRecursiveDescentPattern(testData.Path);

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedSegments)).toBe(true);
        } catch (e) {
            console.log('expected=', testData.ExpectedSegments, '\n', 'got=', result, '\n', 'Path=', testData.Path);
            throw e;
        }
    });
});

class SplitPathByRecursiveDescentPatternData extends TestData {
    private _Path: JSONPath = '';
    public get Path(): JSONPath {
        return this._Path;
    }
    public set Path(value: JSONPath) {
        this._Path = value;
    }

    private _ExpectedSegments: JSONPath[] = [];
    public get ExpectedSegments(): JSONPath[] {
        return this._ExpectedSegments;
    }
    public set ExpectedSegments(value: JSONPath[]) {
        this._ExpectedSegments = value;
    }
}

const testData: SplitPathByRecursiveDescentPatternData[] = [
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: '$.store.book[0].title',
        ExpectedSegments: ['$.store.book[0].title']
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: '$..author',
        ExpectedSegments: ['$', 'author']
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: "$.store.bicycle['item-code']",
        ExpectedSegments: ["$.store.bicycle['item-code']"]
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: '$.data[*].price',
        ExpectedSegments: ['$.data[*].price']
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: "$['user info']['address.wind'][1].street",
        ExpectedSegments: ["$['user info']['address.wind'][1].street"]
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: "$.products['item-details..'].dimensions[0].width.dimensions[2][3].width",
        ExpectedSegments: ["$.products['item-details..'].dimensions[0].width.dimensions[2][3].width"]
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: "$..['1st_category'].name",
        ExpectedSegments: ['$', "['1st_category'].name"]
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: `$.data.user.preferences['theme-settings',"font-size",3]`,
        ExpectedSegments: [`$.data.user.preferences['theme-settings',"font-size",3]`]
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: '$.transactions[1:5:2].amount',
        ExpectedSegments: ['$.transactions[1:5:2].amount']
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: "$['report-data']..['total.sum']..store.bicycle['item-code']",
        ExpectedSegments: ["$['report-data']", "['total.sum']", "store.bicycle['item-code']"]
    }),
    Object.assign(new SplitPathByRecursiveDescentPatternData(), {
        Path: "$['report-data']..['total.sum..()&^']..store.bicycle['item-code']",
        ExpectedSegments: ["$['report-data']", "['total.sum..()&^']", "store.bicycle['item-code']"]
    })
];
