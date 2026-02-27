import { TestData } from '@internal';
import { AreEqual } from '@object';
import {
    CollectionMemberSegment,
    type JSONPath,
    LinearCollectionSelector,
    Parse,
    RecursiveDescentSegmentsToString,
    type RecursiveDescentSegments
} from '@path';
import { describe, expect, it } from 'vitest';

describe('parser', () => {
    const areEqual = new AreEqual();

    it.each(testData)('Parsing of $Path should match expected value', (testData) => {
        let result = Parse(testData.Path);

        try {
            expect(areEqual.AreEqual(result, testData.ExpectedPathSegment)).toBe(true);
        } catch (e) {
            console.log(
                'expected=',
                JSON.stringify(testData.ExpectedPathSegment, null, 2),
                '\n',
                'got=',
                JSON.stringify(result, null, 2),
                '\n',
                'Path=',
                testData.Path
            );
            throw e;
        }
    });

    it.each(testData)('Reverse parsing of $Path should match original path', (testData) => {
        let result = Parse(testData.Path);
        let resultStr = RecursiveDescentSegmentsToString(result);

        try {
            expect(resultStr).toBe(testData.Path);
        } catch (e) {
            console.log('expected=', testData.Path, '\n', 'got=', resultStr);
            throw e;
        }
    });
});

class ParseData extends TestData {
    private _Path: JSONPath = '';
    public get Path(): JSONPath {
        return this._Path;
    }
    public set Path(value: JSONPath) {
        this._Path = value;
    }

    private _ExpectedPathSegment: RecursiveDescentSegments = [];
    public get ExpectedPathSegment(): RecursiveDescentSegments {
        return this._ExpectedPathSegment;
    }
    public set ExpectedPathSegment(value: RecursiveDescentSegments) {
        this._ExpectedPathSegment = value;
    }
}

const testData: ParseData[] = [
    Object.assign(new ParseData(), {
        Path: '$[1,3,5]',
        ExpectedPathSegment: [
            [
                Object.assign(new CollectionMemberSegment(), {
                    Key: '$',
                    IsKeyRoot: true,
                    ExpectLinear: true,
                    ExpectAssociative: true
                }),
                Object.assign(new CollectionMemberSegment(), {
                    UnionSelector: [
                        Object.assign(new CollectionMemberSegment(), { Index: 1 }),
                        Object.assign(new CollectionMemberSegment(), { Index: 3 }),
                        Object.assign(new CollectionMemberSegment(), { Index: 5 })
                    ],
                    ExpectLinear: true,
                    ExpectAssociative: true
                })
            ]
        ]
    }),
    Object.assign(new ParseData(), {
        Path: "$['report-data']..['total.sum']",
        ExpectedPathSegment: [
            [
                Object.assign(new CollectionMemberSegment(), {
                    Key: '$',
                    IsKeyRoot: true,
                    ExpectLinear: true,
                    ExpectAssociative: true
                }),
                Object.assign(new CollectionMemberSegment(), { Key: 'report-data', ExpectAssociative: true })
            ],
            [Object.assign(new CollectionMemberSegment(), { Key: 'total.sum', ExpectAssociative: true })]
        ]
    }),
    Object.assign(new ParseData(), {
        Path: '$.transactions[1:5:2].*',
        ExpectedPathSegment: [
            [
                Object.assign(new CollectionMemberSegment(), {
                    Key: '$',
                    IsKeyRoot: true,
                    ExpectLinear: true,
                    ExpectAssociative: true
                }),
                Object.assign(new CollectionMemberSegment(), { Key: 'transactions', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), {
                    LinearCollectionSelector: Object.assign(new LinearCollectionSelector(), {
                        Start: 1,
                        End: 5,
                        Step: 2
                    }),
                    ExpectLinear: true
                }),
                Object.assign(new CollectionMemberSegment(), { Key: '*', IsKeyIndexAll: true, ExpectAssociative: true })
            ]
        ]
    }),
    Object.assign(new ParseData(), {
        Path: "$.data.user.preferences['theme-settings','font-size']",
        ExpectedPathSegment: [
            [
                Object.assign(new CollectionMemberSegment(), {
                    Key: '$',
                    IsKeyRoot: true,
                    ExpectLinear: true,
                    ExpectAssociative: true
                }),
                Object.assign(new CollectionMemberSegment(), { Key: 'data', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), { Key: 'user', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), { Key: 'preferences', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), {
                    UnionSelector: [
                        Object.assign(new CollectionMemberSegment(), { Key: 'theme-settings' }),
                        Object.assign(new CollectionMemberSegment(), { Key: 'font-size' })
                    ],
                    ExpectLinear: true,
                    ExpectAssociative: true
                })
            ]
        ]
    }),
    Object.assign(new ParseData(), {
        Path: "$..['1st_category'].name",
        ExpectedPathSegment: [
            [
                Object.assign(new CollectionMemberSegment(), {
                    Key: '$',
                    IsKeyRoot: true,
                    ExpectLinear: true,
                    ExpectAssociative: true
                })
            ],
            [
                Object.assign(new CollectionMemberSegment(), { Key: '1st_category', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), { Key: 'name', ExpectAssociative: true })
            ]
        ]
    }),
    Object.assign(new ParseData(), {
        Path: "$.products['item-details'].dimensions[0].width",
        ExpectedPathSegment: [
            [
                Object.assign(new CollectionMemberSegment(), {
                    Key: '$',
                    IsKeyRoot: true,
                    ExpectLinear: true,
                    ExpectAssociative: true
                }),
                Object.assign(new CollectionMemberSegment(), { Key: 'products', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), { Key: 'item-details', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), { Key: 'dimensions', ExpectAssociative: true }),
                Object.assign(new CollectionMemberSegment(), { Index: 0, ExpectLinear: true }),
                Object.assign(new CollectionMemberSegment(), { Key: 'width', ExpectAssociative: true })
            ]
        ]
    })
];
