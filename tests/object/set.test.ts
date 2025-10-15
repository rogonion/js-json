import type {TestData} from '@internal'
import type {JSONPath} from '@path'
import {Conversion, DataKinds, DynamicSchemaNode, type Schema} from '@schema'
import {describe, expect, it} from 'vitest'
import {AreEqual, type SetObjectResult, SetValue} from '@object'
import {JSONstringify} from '@core'
import {Address, AddressSchema, ComplexData, User, UserProfile, UserProfileSchema} from '../misc.ts'

describe('set', () => {
    it.each(TestData)('$Path expected no of modifications? $ExpectedOk', (testData) => {
        let res: SetObjectResult | undefined

        try {
            res = new SetValue(new Conversion(), testData.Schema).Set(testData.Root, testData.Path, testData.ValueToSet)
            expect(new AreEqual().AreEqual(res.NoOfModifications, testData.ExpectedOk, false, true), 'No of Modifications').toBe(true)
            expect(new AreEqual().AreEqual(res.Result, testData.ExpectedValue, false, true), 'Expected Value').toBe(true)
        } catch (e) {
            if (testData.ExpectedOk) {
                console.log(
                    'Path=', testData.Path, '\n',
                    'Result=', JSONstringify(res ? res.Result : undefined), '\n',
                    'Expected=', JSONstringify(testData.ExpectedValue), '\n',
                    'Path=', testData.Path
                )
                throw e
            }
        }
    })
})

interface SetData extends TestData {
    Root: any
    Path: JSONPath
    ValueToSet: any
    ExpectedOk: number
    ExpectedValue: any
    Schema?: Schema
}

const TestData: SetData[] = [
    {
        Root: undefined,
        Path: '$[5].Address.ZipCode',
        ValueToSet: '1234',
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Array)
            .withTypeOf(typeof [new UserProfile(), new UserProfile()])
            .withChildNodesLinearCollectionElementsSchema(UserProfileSchema())
            .build(),
        ExpectedOk: 1,
        ExpectedValue: [undefined, undefined, undefined, undefined, undefined, (() => {
            const x = new UserProfile()
            x.Address.ZipCode = '1234'
            return x
        })()]
    },
    {
        Root: undefined,
        Path: '$[10]',
        ValueToSet: 10,
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Array)
            .withTypeOf(typeof [0, 1])
            .withChildNodesLinearCollectionElementsSchema(DynamicSchemaNode.create()
                .withKind(DataKinds.Number)
                .withTypeOf(typeof 0)
                .build())
            .build(),
        ExpectedOk: 1,
        ExpectedValue: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 10]
    },
    {
        Root: undefined,
        Path: '$.Address.ZipCode',
        ValueToSet: '1234',
        Schema: UserProfileSchema(),
        ExpectedOk: 1,
        ExpectedValue: (() => {
            const x = new UserProfile()
            x.Address.ZipCode = '1234'
            return x
        })()
    },
    {
        Root: new Address(),
        Path: '$.ZipCode',
        ValueToSet: '1234',
        Schema: AddressSchema(),
        ExpectedOk: 1,
        ExpectedValue: (() => {
            const x = new Address()
            x.ZipCode = '1234'
            return x
        })()
    },
    {
        Root: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'Alice'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.User.Name = 'Bob'
                x.Items = [{Name: 'Item 1', Value: 0}, {Name: 'Item 2', Value: 0}]
                return x
            })()
        ],
        Path: '$..Items[*].Value',
        ExpectedOk: 2,
        ValueToSet: 10000,
        ExpectedValue: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'Alice'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.User.Name = 'Bob'
                x.Items = [{Name: 'Item 1', Value: 10000}, {Name: 'Item 2', Value: 10000}]
                return x
            })()
        ]
    },
    {
        Root: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'Alice'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.User.Name = 'Bob'
                x.Items = [{Name: 'Item 1', Value: 0}, {Name: 'Item 2', Value: 0}]
                return x
            })()
        ],
        Path: '$..User..Name',
        ExpectedOk: 2,
        ValueToSet: 'OneName',
        ExpectedValue: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'OneName'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.User.Name = 'OneName'
                x.Items = [{Name: 'Item 1', Value: 0}, {Name: 'Item 2', Value: 0}]
                return x
            })()
        ]
    },
    {
        Root: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'Alice'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.User.Name = 'Bob'
                x.Items = [{Name: 'Item 1', Value: 0}, {Name: 'Item 2', Value: 0}]
                return x
            })()
        ],
        Path: '$..Name',
        ExpectedOk: 4,
        ValueToSet: 'OneName',
        ExpectedValue: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'OneName'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.User.Name = 'OneName'
                x.Items = [{Name: 'OneName', Value: 0}, {Name: 'OneName', Value: 0}]
                return x
            })()
        ]
    },
    {
        Root: undefined,
        Path: '$.Addresses[1,4].City[5][\'location\',\'sub-location\']',
        ValueToSet: 'LocationSublocation',
        ExpectedOk: 4,
        ExpectedValue: {
            Addresses: [
                undefined,
                {
                    City: [undefined, undefined, undefined, undefined, undefined, {
                        'location': 'LocationSublocation',
                        'sub-location': 'LocationSublocation'
                    }]
                },
                undefined,
                undefined,
                {
                    City: [undefined, undefined, undefined, undefined, undefined, {
                        'location': 'LocationSublocation',
                        'sub-location': 'LocationSublocation'
                    }]
                }
            ]
        }
    },
    {
        Root: new ComplexData(),
        Path: '$.User[\'Name\',\'Email\']',
        ValueToSet: 'NameEmail',
        ExpectedOk: 2,
        ExpectedValue: (() => {
            const x = new ComplexData()
            x.User.Name = 'NameEmail'
            x.User.Email = 'NameEmail'
            return x
        })()
    },
    {
        Root: [
            (() => {
                const x = new Address()
                x.City = 'City0'
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'City1'
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'City2'
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'City3'
                return x
            })()
        ],
        Path: '$[::2]City',
        ValueToSet: 'CityDouble',
        ExpectedOk: 2,
        ExpectedValue: [
            (() => {
                const x = new Address()
                x.City = 'CityDouble'
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'City1'
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'CityDouble'
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'City3'
                return x
            })()
        ]
    },
    {
        Root: new ComplexData(),
        Path: '$.Items[1].Name',
        ValueToSet: 'I am a User',
        ExpectedOk: 1,
        ExpectedValue: (() => {
            const x = new ComplexData()
            // @ts-ignore
            x.Items = [undefined, {Name: 'I am a User'}]
            return x
        })()
    }
]