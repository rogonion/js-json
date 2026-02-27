import { TestData } from '@internal';
import { AreEqual, JSObject } from '@object';
import { type JSONPath } from '@path';
import { describe, expect, it } from 'vitest';
import { User, ComplexData, Address } from './misc';

describe('JSObject Delete', () => {
    const areEqual = new AreEqual();

    it.each(testData)('$TestTitle', (testData) => {
        const obj = new JSObject();
        obj.Source = testData.Root;

        const noOfResults = obj.Delete(testData.Path);

        try {
            expect(noOfResults).toBe(testData.ExpectedOk);
            expect(areEqual.AreEqual(obj.Source, testData.ExpectedValue)).toBe(true);
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
                JSON.stringify(obj.Source, null, 2)
            );
            throw e;
        }
    });
});

class DeleteData extends TestData {
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

const testData: DeleteData[] = [
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 1: Recursive descent delete values',
        Root: [
            { User: Object.assign(new User(), { Name: 'Alice' }) },
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [
                    { Name: 'Item 1', Value: 10000 },
                    { Name: 'Item 2', Value: 10000 }
                ]
            })
        ],
        Path: '$..Items[*].Value',
        ExpectedOk: 2,
        ExpectedValue: [
            { User: Object.assign(new User(), { Name: 'Alice' }) },
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ]
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 2: Recursive descent delete user names',
        Root: [
            { User: Object.assign(new User(), { Name: 'OneName' }) },
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'OneName' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ],
        Path: '$..User..Name',
        ExpectedOk: 2,
        ExpectedValue: [
            {
                User: (() => {
                    const u = new User();
                    delete (u as any).Name;
                    return u;
                })()
            },
            Object.assign(new ComplexData(), {
                User: (() => {
                    const u = new User();
                    delete (u as any).Name;
                    return u;
                })(),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ]
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 3: Recursive descent delete all names',
        Root: [
            { User: Object.assign(new User(), { Name: 'OneName' }) },
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'OneName' }),
                Items: [{ Name: 'OneName' }, { Name: 'OneName' }]
            })
        ],
        Path: '$..Name',
        ExpectedOk: 4,
        ExpectedValue: [
            {
                User: (() => {
                    const u = new User();
                    delete (u as any).Name;
                    return u;
                })()
            },
            Object.assign(new ComplexData(), {
                User: (() => {
                    const u = new User();
                    delete (u as any).Name;
                    return u;
                })(),
                Items: [{}, {}]
            })
        ]
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 4: Complex path deletion with union',
        Root: {
            Addresses: [
                null,
                { City: [null, null, null, null, null, { location: 'A', 'sub-location': 'B' }] },
                null,
                null,
                { City: [null, null, null, null, null, { location: 'C', 'sub-location': 'D' }] }
            ]
        },
        Path: "$.Addresses[1,4].City[5]['location','sub-location']",
        ExpectedOk: 4,
        ExpectedValue: {
            Addresses: [
                null,
                { City: [null, null, null, null, null, {}] },
                null,
                null,
                { City: [null, null, null, null, null, {}] }
            ]
        }
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 5: Union selector delete on object',
        Root: Object.assign(new ComplexData(), { User: { Name: 'NameEmail', Email: 'NameEmail' } }),
        Path: "$.User['Name','Email']",
        ExpectedOk: 2,
        ExpectedValue: Object.assign(new ComplexData(), { User: {} })
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 6: Slice selector delete',
        Root: [
            Object.assign(new Address(), { City: 'CityDouble' }),
            Object.assign(new Address(), { City: 'City1' }),
            Object.assign(new Address(), { City: 'CityDouble' }),
            Object.assign(new Address(), { City: 'City3' })
        ],
        Path: '$[::2].City',
        ExpectedOk: 2,
        ExpectedValue: [
            (() => {
                const a = new Address();
                delete (a as any).City;
                return a;
            })(),
            Object.assign(new Address(), { City: 'City1' }),
            (() => {
                const a = new Address();
                delete (a as any).City;
                return a;
            })(),
            Object.assign(new Address(), { City: 'City3' })
        ]
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 7: Array index delete',
        Root: Object.assign(new ComplexData(), { Items: [{}, { Name: 'I am User' }] }),
        Path: '$.Items[1].Name',
        ExpectedOk: 1,
        ExpectedValue: Object.assign(new ComplexData(), { Items: [{}, {}] })
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 8: Delete map value',
        Root: { address: { address: 'test' } },
        Path: '$.address',
        ExpectedOk: 1,
        ExpectedValue: {}
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 9: Delete root array index',
        Root: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        Path: '$[10]',
        ExpectedOk: 1,
        ExpectedValue: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 10: Delete root object',
        Root: 'some value',
        Path: '$',
        ExpectedOk: 1,
        ExpectedValue: undefined
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 11: Delete slice element (shift)',
        Root: [1, 2, 3, 4],
        Path: '$[1]',
        ExpectedOk: 1,
        ExpectedValue: [1, 3, 4]
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 12: Delete non-existent map key',
        Root: { a: 1 },
        Path: '$.b',
        ExpectedOk: 0,
        ExpectedValue: { a: 1 }
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 13: Delete from nil map',
        Root: null,
        Path: '$.key',
        ExpectedOk: 0,
        ExpectedValue: null
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 14: Delete from nil slice',
        Root: null,
        Path: '$[0]',
        ExpectedOk: 0,
        ExpectedValue: null
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 15: Delete index out of bounds',
        Root: [1, 2],
        Path: '$[5]',
        ExpectedOk: 0,
        ExpectedValue: [1, 2] // Expect original array, not undefined
    }),
    Object.assign(new DeleteData(), {
        TestTitle: 'Test Case 16: Delete property from primitive',
        Root: 123,
        Path: '$.key',
        ExpectedOk: 0,
        ExpectedValue: 123
    })
];
