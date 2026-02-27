import { TestData } from '@internal';
import { AreEqual } from '@object';
import { type JSONPath, SplitPathSegmentByDotNotationPattern } from '@path';
import { describe, expect, it } from 'vitest';

describe('split_recursive_descent_path_by_member_dot_notation', () => {
    const areEqual = new AreEqual();

    it.each(testData)('Splitting of $Segment should match expected value', (testData) => {
        let result = SplitPathSegmentByDotNotationPattern(testData.Segment);

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedSegments)).toBe(true);
        } catch (e) {
            console.log(
                'expected=',
                testData.ExpectedSegments,
                '\n',
                'got=',
                result,
                '\n',
                'Segment=',
                testData.Segment
            );
            throw e;
        }
    });
});

class SplitRecursiveDescentPathByMemberDotNotationPatternData extends TestData {
    private _Segment: JSONPath = '';
    public get Segment(): JSONPath {
        return this._Segment;
    }
    public set Segment(value: JSONPath) {
        this._Segment = value;
    }

    private _ExpectedSegments: JSONPath[] = [];
    public get ExpectedSegments(): JSONPath[] {
        return this._ExpectedSegments;
    }
    public set ExpectedSegments(value: JSONPath[]) {
        this._ExpectedSegments = value;
    }
}

const testData: SplitRecursiveDescentPathByMemberDotNotationPatternData[] = [
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: '$.store.book[0].title',
        ExpectedSegments: ['$', 'store', 'book[0]', 'title']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: '$',
        ExpectedSegments: ['$']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: 'author',
        ExpectedSegments: ['author']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "$.store.bicycle['item-code']",
        ExpectedSegments: ['$', 'store', "bicycle['item-code']"]
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: '$.data[*].price',
        ExpectedSegments: ['$', 'data[*]', 'price']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "$['user info']['address.wind'][1].street",
        ExpectedSegments: ["$['user info']['address.wind'][1]", 'street']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "$.products['item-details..'].dimensions[0].width.dimensions[2][3].width",
        ExpectedSegments: ['$', "products['item-details..']", 'dimensions[0]', 'width', 'dimensions[2][3]', 'width']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "['1st_category'].name",
        ExpectedSegments: ["['1st_category']", 'name']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "$.data.user.preferences['theme-settings','font-size',3]",
        ExpectedSegments: ['$', 'data', 'user', "preferences['theme-settings','font-size',3]"]
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: '$.transactions[1:5:2].amount',
        ExpectedSegments: ['$', 'transactions[1:5:2]', 'amount']
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "$['report-data']",
        ExpectedSegments: ["$['report-data']"]
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "['total.sum']",
        ExpectedSegments: ["['total.sum']"]
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "store.bicycle['item-code']",
        ExpectedSegments: ['store', "bicycle['item-code']"]
    }),
    Object.assign(new SplitRecursiveDescentPathByMemberDotNotationPatternData(), {
        Segment: "['total.sum..()&^']",
        ExpectedSegments: ["['total.sum..()&^']"]
    })
];
