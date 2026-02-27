import { TestData } from '@internal';
import { AreEqual, JSObject } from '@object';
import { type JSONPath } from '@path';
import { describe, expect, it } from 'vitest';
import { User, ComplexData, Address } from './misc';

describe('JSObject Get', () => {
    const areEqual = new AreEqual();

    it.each(testData)('$TestTitle', (testData) => {
        const obj = new JSObject();
        obj.Source = testData.Root;

        const noOfResults = obj.Get(testData.Path);

        try {
            expect(noOfResults).toBe(testData.ExpectedOk);
            expect(areEqual.AreEqual(obj.ValueFound, testData.ExpectedValue)).toBe(true);
        } catch (e) {
            console.log(
                'TestTitle=',
                testData.TestTitle,
                '\n',
                'Path=',
                testData.Path,
                '\n',
                'ExpectedOk=',
                testData.ExpectedOk,
                'Got=',
                noOfResults,
                '\n',
                'ExpectedValue=',
                JSON.stringify(testData.ExpectedValue, null, 2),
                '\n',
                'GotValue=',
                JSON.stringify(obj.ValueFound, null, 2)
            );
            throw e;
        }
    });
});

class GetData extends TestData {
    private _Root: any;
    public get Root(): any {
        return this._Root;
    }
    public set Root(value: any) {
        this._Root = value;
    }

    private _Path: JSONPath = '';
    public get Path(): JSONPath {
        return this._Path;
    }
    public set Path(value: JSONPath) {
        this._Path = value;
    }

    private _ExpectedOk: number = 0;
    public get ExpectedOk(): number {
        return this._ExpectedOk;
    }
    public set ExpectedOk(value: number) {
        this._ExpectedOk = value;
    }

    private _ExpectedValue: any;
    public get ExpectedValue(): any {
        return this._ExpectedValue;
    }
    public set ExpectedValue(value: any) {
        this._ExpectedValue = value;
    }
}

const testData: GetData[] = [
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 1: Complex nested path with maps and structs',
        Root: {
            data: {
                metadata: {
                    Address: Object.assign(new Address(), { Street: '123 Main St', City: 'Anytown' }),
                    Status: 'active'
                }
            }
        },
        Path: '$.data.metadata.Address.City',
        ExpectedOk: 1,
        ExpectedValue: 'Anytown'
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 2: Recursive descent with a wildcard to get all names',
        Root: [
            new Map([['User', Object.assign(new User(), { Name: 'Alice' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ],
        Path: '$..Name',
        ExpectedOk: 4,
        ExpectedValue: ['Alice', 'Item 1', 'Item 2', 'Bob']
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 3: Union operator to get multiple fields from a single struct',
        Root: Object.assign(new ComplexData(), {
            ID: 99,
            User: Object.assign(new User(), {
                ID: 10,
                Name: 'Charlie',
                Email: 'charlie@example.com'
            })
        }),
        Path: "$.User['ID', 'Name']",
        ExpectedOk: 2,
        ExpectedValue: [10, 'Charlie']
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 4: Deep path with a slice index and field extraction',
        Root: Object.assign(new ComplexData(), {
            Items: [
                { Name: 'First', Value: 10 },
                { Name: 'Second', Value: 20 },
                { Name: 'Third', Value: 30 }
            ]
        }),
        Path: '$.Items[1].Value',
        ExpectedOk: 1,
        ExpectedValue: 20
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 5: Path that should not find a match',
        Root: {
            store: { book: 'fiction' }
        },
        Path: '$.store.magazine',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 6',
        Root: [
            new Map([['one', { Three: [0, 1, 2, 3, new Map([['04', [0, 4]]]), 5, 6, 7, 8, 9] }]]),
            { Two: new Map([['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]]) },
            [new Map([['Three', [0, 1, 2, 3, { TwentyFour: 24 }, 5, 6, 7, 8, 9]]])]
        ],
        Path: "$..Three[::2]['TwentyFour','04']",
        ExpectedOk: 2,
        ExpectedValue: [[0, 4], 24]
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 7',
        Root: [
            new Map([['one', { Three: [0, 1, 2, 3, [4], 5, 6, 7, 8, 9] }]]),
            { Two: new Map([['Three', [0, 1, 2, 3, new Map([['04', '04']]), 5, 6, 7, 8, 9]]]) },
            [new Map([['Three', [0, 1, 2, 3, { TwentyFour: 24 }, 5, 6, 7, 8, 9]]])]
        ],
        Path: "$..Three[::2]['TwentyFour','04']",
        ExpectedOk: 2,
        ExpectedValue: ['04', 24]
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 8',
        Root: [
            new Map([['one', { Three: [0, 1, 2, 3, [new Map([['04', '04']])], 5, 6, 7, 8, 9] }]]),
            { Two: new Map([['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]]) },
            [new Map([['Three', [0, 1, 2, 3, [{ TwentyFour: 24 }], 5, 6, 7, 8, 9]]])]
        ],
        Path: '$..Three[::2]..TwentyFour',
        ExpectedOk: 1,
        ExpectedValue: [24]
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 9',
        Root: {
            one: [1, new Map([['Two', [12]]]), new Map([['three', ['four']]]), new Map([['five', [{ Two: [13] }]]])]
        },
        Path: '$.one..Two[*]',
        ExpectedOk: 2,
        ExpectedValue: [12, 13]
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 10',
        Root: [
            { Five: 'five', Six: '0_six' },
            { Five: 'five', Seven: 'seven', Six: '' },
            { Five: 'five', Six: '2_six' }
        ],
        Path: '$..Six',
        ExpectedOk: 3,
        ExpectedValue: ['0_six', '', '2_six']
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 11',
        Root: {
            one: 1,
            two: 2,
            three: [
                'four',
                new Map([
                    ['1', 1],
                    ['2', 2]
                ])
            ]
        },
        Path: "$.three[1].['1']",
        ExpectedOk: 1,
        ExpectedValue: 1
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 12: Get root object',
        Root: 'root value',
        Path: '$',
        ExpectedOk: 1,
        ExpectedValue: 'root value'
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 13: Get from nil source',
        Root: null,
        Path: '$.some.path',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 14: Get index out of bounds',
        Root: [1, 2],
        Path: '$[5]',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 15: Get property from primitive',
        Root: 123,
        Path: '$.key',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 16: Get from nil map (undefined)',
        Root: undefined,
        Path: '$.key',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 17: Get from nil slice (undefined)',
        Root: undefined,
        Path: '$[0]',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 18: Map key conversion failure (using string key for number map)',
        Root: new Map([[1, 'one']]),
        Path: '$.not_an_int',
        ExpectedOk: 0,
        ExpectedValue: undefined
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 19: Get from Set using wildcard',
        Root: new Set([1, 2, 3]),
        Path: '$[*]',
        ExpectedOk: 3,
        ExpectedValue: [1, 2, 3]
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 20: Get from Set using index',
        Root: new Set(['a', 'b']),
        Path: '$[1]',
        ExpectedOk: 1,
        ExpectedValue: 'b'
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 21: Nested Set access',
        Root: { data: new Set([{ id: 1 }, { id: 2 }]) },
        Path: '$.data[*].id',
        ExpectedOk: 2,
        ExpectedValue: [1, 2]
    }),
    Object.assign(new GetData(), {
        TestTitle: 'Test Case 22: Recursive descent with Set',
        Root: new Set([{ name: 'A' }, { child: new Set([{ name: 'B' }]) }]),
        Path: '$..name',
        ExpectedOk: 2,
        ExpectedValue: ['A', 'B']
    })
];
