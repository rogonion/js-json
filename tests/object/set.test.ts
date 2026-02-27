import { TestData } from '@internal';
import { AreEqual, JSObject } from '@object';
import { type JSONPath } from '@path';
import { describe, expect, it } from 'vitest';
import { User, ComplexData, Address } from './misc';

describe('JSObject Set', () => {
    const areEqual = new AreEqual();

    it.each(testData)('$TestTitle', (testData) => {
        const obj = new JSObject();
        obj.Source = testData.Root;

        const noOfResults = obj.Set(testData.Path, testData.ValueToSet);

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

class SetData extends TestData {
    private _Root: any = undefined;
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

    private _ValueToSet: any;
    public get ValueToSet(): any {
        return this._ValueToSet;
    }
    public set ValueToSet(value: any) {
        this._ValueToSet = value;
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

const testData: SetData[] = [
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 1: Set nested property in array (sparse)',
        Root: undefined,
        Path: '$[5].Address.ZipCode',
        ValueToSet: '1234',
        ExpectedOk: 1,
        ExpectedValue: [undefined, undefined, undefined, undefined, undefined, { Address: { ZipCode: '1234' } }]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 2: Set array index (sparse)',
        Root: undefined,
        Path: '$[10]',
        ValueToSet: 10,
        ExpectedOk: 1,
        ExpectedValue: [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            10
        ]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 3: Set nested property (implicit root object)',
        Root: undefined,
        Path: '$.Address.ZipCode',
        ValueToSet: '1234',
        ExpectedOk: 1,
        ExpectedValue: { Address: { ZipCode: '1234' } }
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 4: Set property (implicit root object)',
        Root: undefined,
        Path: '$.ZipCode',
        ValueToSet: '1234',
        ExpectedOk: 1,
        ExpectedValue: { ZipCode: '1234' }
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 5: Recursive descent set in complex structure',
        Root: [
            new Map([['User', Object.assign(new User(), { Name: 'Alice' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [
                    { Name: 'Item 1', Value: 0 },
                    { Name: 'Item 2', Value: 0 }
                ]
            })
        ],
        Path: '$..Items[*].Value',
        ValueToSet: 10000,
        ExpectedOk: 2,
        ExpectedValue: [
            new Map([['User', Object.assign(new User(), { Name: 'Alice' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [
                    { Name: 'Item 1', Value: 10000 },
                    { Name: 'Item 2', Value: 10000 }
                ]
            })
        ]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 6: Recursive descent set (User..Name)',
        Root: [
            new Map([['User', Object.assign(new User(), { Name: 'Alice' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ],
        Path: '$..User..Name',
        ValueToSet: 'OneName',
        ExpectedOk: 2,
        ExpectedValue: [
            new Map([['User', Object.assign(new User(), { Name: 'OneName' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'OneName' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 7: Recursive descent set (..Name)',
        Root: [
            new Map([['User', Object.assign(new User(), { Name: 'Alice' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ],
        Path: '$..Name',
        ValueToSet: 'OneName',
        ExpectedOk: 4,
        ExpectedValue: [
            new Map([['User', Object.assign(new User(), { Name: 'OneName' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'OneName' }),
                Items: [{ Name: 'OneName' }, { Name: 'OneName' }]
            })
        ]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 8: Complex path creation with union and array indices',
        Root: undefined,
        Path: "$.Addresses[1,4].City[5]['location','sub-location']",
        ValueToSet: 'LocationSublocation',
        ExpectedOk: 4,
        ExpectedValue: (() => {
            const expected: any = { Addresses: [] };
            expected.Addresses[1] = { City: [] };
            expected.Addresses[1].City[5] = { location: 'LocationSublocation', 'sub-location': 'LocationSublocation' };
            expected.Addresses[4] = { City: [] };
            expected.Addresses[4].City[5] = { location: 'LocationSublocation', 'sub-location': 'LocationSublocation' };
            return expected;
        })()
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 9: Union selector set on struct',
        Root: new ComplexData(),
        Path: "$.User['Name','Email']",
        ValueToSet: 'NameEmail',
        ExpectedOk: 2,
        ExpectedValue: Object.assign(new ComplexData(), {
            User: Object.assign(new User(), {
                Name: 'NameEmail',
                Email: 'NameEmail'
            })
        })
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 10: Slice selector set',
        Root: [
            Object.assign(new Address(), { City: 'City0' }),
            Object.assign(new Address(), { City: 'City1' }),
            Object.assign(new Address(), { City: 'City2' }),
            Object.assign(new Address(), { City: 'City3' })
        ],
        Path: '$[::2]City',
        ValueToSet: 'CityDouble',
        ExpectedOk: 2,
        ExpectedValue: [
            Object.assign(new Address(), { City: 'CityDouble' }),
            Object.assign(new Address(), { City: 'City1' }),
            Object.assign(new Address(), { City: 'CityDouble' }),
            Object.assign(new Address(), { City: 'City3' })
        ]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 11: Array index set',
        Root: new ComplexData(),
        Path: '$.Items[1].Name',
        ValueToSet: 'I am User',
        ExpectedOk: 1,
        ExpectedValue: Object.assign(new ComplexData(), {
            Items: [undefined, { Name: 'I am User' }]
        })
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 12: Set map value',
        Root: undefined,
        Path: '$.address',
        ValueToSet: { address: 'test' },
        ExpectedOk: 1,
        ExpectedValue: { address: { address: 'test' } }
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 13: Set root array index',
        Root: undefined,
        Path: '$[10]',
        ValueToSet: 10,
        ExpectedOk: 1,
        ExpectedValue: [
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            10
        ]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 14: Set root object',
        Root: 'old root',
        Path: '$',
        ValueToSet: 'new root',
        ExpectedOk: 1,
        ExpectedValue: 'new root'
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 15: Set slice index with expansion',
        Root: [1, 2],
        Path: '$[4]',
        ValueToSet: 5,
        ExpectedOk: 1,
        ExpectedValue: [1, 2, undefined, undefined, 5]
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 16: Set type mismatch (JS dynamic typing allows this)',
        Root: { Age: 20 },
        Path: '$.Age',
        ValueToSet: 'not an int',
        ExpectedOk: 1,
        ExpectedValue: { Age: 'not an int' }
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 17: Implicit creation (nil root -> map)',
        Root: undefined,
        Path: '$.a.b',
        ValueToSet: 1,
        ExpectedOk: 1,
        ExpectedValue: { a: { b: 1 } }
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 18: Set root to nil',
        Root: 'old root',
        Path: '$',
        ValueToSet: null,
        ExpectedOk: 1,
        ExpectedValue: null
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 19: Set map key (JS Map allows mixed keys)',
        Root: new Map(),
        Path: '$.abc',
        ValueToSet: 'value',
        ExpectedOk: 1,
        ExpectedValue: new Map([['abc', 'value']])
    }),
    Object.assign(new SetData(), {
        TestTitle: 'Test Case 20: Auto-init nil struct pointer (JS object)',
        Root: null,
        Path: '$.Name',
        ValueToSet: 'Alice',
        ExpectedOk: 1,
        ExpectedValue: { Name: 'Alice' }
    })
];
