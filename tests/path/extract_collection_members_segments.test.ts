import { TestData } from '@internal';
import { AreEqual } from '@object';
import {
    CollectionMemberSegment,
    ExtractCollectionMemberSegments,
    type JSONPath,
    LinearCollectionSelector,
    type RecursiveDescentSegment
} from '@path';
import { describe, expect, it } from 'vitest';

describe('extract_collection_member_segments', () => {
    const areEqual = new AreEqual();

    it.each(testData)('Extraction of $Segment should match expected value', (testData) => {
        let result = ExtractCollectionMemberSegments(testData.Segment);

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
                'Segments=',
                testData.Segment
            );
            throw e;
        }
    });
});

class ExtractCollectionMemberSegmentsData extends TestData {
    private _Segment: JSONPath = '';
    public get Segment(): JSONPath {
        return this._Segment;
    }
    public set Segment(value: JSONPath) {
        this._Segment = value;
    }

    private _ExpectedSegments: RecursiveDescentSegment = [];
    public get ExpectedSegments(): RecursiveDescentSegment {
        return this._ExpectedSegments;
    }
    public set ExpectedSegments(value: RecursiveDescentSegment) {
        this._ExpectedSegments = value;
    }
}

const testData: ExtractCollectionMemberSegmentsData[] = [
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "storebicycle['item-code']",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'storebicycle', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Key: 'item-code', ExpectAssociative: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "['total.sum']",
        ExpectedSegments: [Object.assign(new CollectionMemberSegment(), { Key: 'total.sum', ExpectAssociative: true })]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "$['report-data']",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), {
                Key: '$',
                IsKeyRoot: true,
                ExpectLinear: true,
                ExpectAssociative: true
            }),
            Object.assign(new CollectionMemberSegment(), { Key: 'report-data', ExpectAssociative: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: 'widow[::2][4:5:]',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'widow', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), {
                LinearCollectionSelector: Object.assign(new LinearCollectionSelector(), { Step: 2 }),
                ExpectLinear: true
            }),
            Object.assign(new CollectionMemberSegment(), {
                LinearCollectionSelector: Object.assign(new LinearCollectionSelector(), { Start: 4, End: 5 }),
                ExpectLinear: true
            })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: 'transactions[1:5:2]',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'transactions', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), {
                LinearCollectionSelector: Object.assign(new LinearCollectionSelector(), { Start: 1, End: 5, Step: 2 }),
                ExpectLinear: true
            })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: `preferences['theme-settings',"font-size",3]`,
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'preferences', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), {
                UnionSelector: [
                    Object.assign(new CollectionMemberSegment(), { Key: 'theme-settings' }),
                    Object.assign(new CollectionMemberSegment(), { Key: 'font-size' }),
                    Object.assign(new CollectionMemberSegment(), { Index: 3 })
                ],
                ExpectAssociative: true,
                ExpectLinear: true
            })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "['1st_category']",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: '1st_category', ExpectAssociative: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: 'dimensions[2][3]',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'dimensions', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Index: 2, ExpectLinear: true }),
            Object.assign(new CollectionMemberSegment(), { Index: 3, ExpectLinear: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "products['item-details..']",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'products', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Key: 'item-details..', ExpectAssociative: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "$['user info']['address.wind'][1]",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), {
                Key: '$',
                IsKeyRoot: true,
                ExpectLinear: true,
                ExpectAssociative: true
            }),
            Object.assign(new CollectionMemberSegment(), { Key: 'user info', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Key: 'address.wind', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Index: 1, ExpectLinear: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: 'data[*]',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'data', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), {
                Key: '*',
                IsKeyIndexAll: true,
                ExpectAssociative: true,
                ExpectLinear: true
            })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "bicycle['item-code']",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'bicycle', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Key: 'item-code', ExpectAssociative: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: 'book[0]',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'book', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), { Index: 0, ExpectLinear: true })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: '$',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), {
                Key: '$',
                IsKeyRoot: true,
                ExpectLinear: true,
                ExpectAssociative: true
            })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: 'list[1::2]',
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'list', ExpectAssociative: true }),
            Object.assign(new CollectionMemberSegment(), {
                LinearCollectionSelector: Object.assign(new LinearCollectionSelector(), { Start: 1, Step: 2 }),
                ExpectLinear: true
            })
        ]
    }),
    Object.assign(new ExtractCollectionMemberSegmentsData(), {
        Segment: "['key with spaces']",
        ExpectedSegments: [
            Object.assign(new CollectionMemberSegment(), { Key: 'key with spaces', ExpectAssociative: true })
        ]
    })
];
