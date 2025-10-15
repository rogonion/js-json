import type {TestData} from '@internal'
import type {JSONPath} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual, type DeleteObjectResult, DeleteValue} from '@object'
import {JSONstringify} from '@core'
import {Conversion} from '@schema'
import {Address, ComplexData, User} from '../misc.ts'

describe('delete', () => {
    it.each(TestData)('$Path expected no of modifications? $ExpectedOk', (testData) => {
        let res: DeleteObjectResult | undefined

        try {
            res = new DeleteValue(new Conversion()).Delete(testData.Root, testData.Path)
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


interface DeleteData extends TestData {
    Root: any
    Path: JSONPath
    ExpectedOk: number
    ExpectedValue: any
}

const TestData: DeleteData[] = [
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
                x.Items = [{Name: 'Item 1', Value: 10000}, {Name: 'Item 2', Value: 10000}]
                return x
            })()
        ],
        Path: '$..Items[*].Value',
        ExpectedOk: 2,
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
                //@ts-ignore
                x.Items = [{Name: 'Item 1'}, {Name: 'Item 2'}]
                return x
            })()
        ]
    },
    {
        Root: [
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
        ],
        Path: '$..User..Name',
        ExpectedOk: 2,
        ExpectedValue: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    //@ts-ignore
                    delete x.Name
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                //@ts-ignore
                delete x.User.Name
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
        ],
        Path: '$..Name',
        ExpectedOk: 4,
        ExpectedValue: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    //@ts-ignore
                    delete x.Name
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                //@ts-ignore
                delete x.User.Name
                //@ts-ignore
                x.Items = [{Value: 0}, {Value: 0}]
                return x
            })()
        ]
    },
    {
        Root: {
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
        },
        Path: '$.Addresses[1,4].City[5][\'location\',\'sub-location\']',
        ExpectedOk: 4,
        ExpectedValue: {
            Addresses: [
                undefined,
                {
                    City: [undefined, undefined, undefined, undefined, undefined, {}]
                },
                undefined,
                undefined,
                {
                    City: [undefined, undefined, undefined, undefined, undefined, {}]
                }
            ]
        }
    },
    {
        Root: (() => {
            const x = new ComplexData()
            x.User.Name = 'NameEmail'
            x.User.Email = 'NameEmail'
            return x
        })(),
        Path: '$.User[\'Name\',\'Email\']',
        ExpectedOk: 2,
        ExpectedValue: (() => {
            const x = new ComplexData()
            //@ts-ignore
            delete x.User.Name
            //@ts-ignore
            delete x.User.Email
            return x
        })()
    },
    {
        Root: [
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
        ],
        Path: '$[::2]City',
        ExpectedOk: 2,
        ExpectedValue: [
            (() => {
                const x = new Address()
                //@ts-ignore
                delete x.City
                return x
            })(),
            (() => {
                const x = new Address()
                x.City = 'City1'
                return x
            })(),
            (() => {
                const x = new Address()
                //@ts-ignore
                delete x.City
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
        Root: (() => {
            const x = new ComplexData()
            // @ts-ignore
            x.Items = [undefined, {Name: 'I am a User'}]
            return x
        })(),
        Path: '$.Items[1].Name',
        ExpectedOk: 1,
        ExpectedValue: (() => {
            const x = new ComplexData()
            // @ts-ignore
            x.Items = [undefined, {}]
            return x
        })()
    },
    {
        Root: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 10],
        Path: '$.[10]',
        ExpectedOk: 1,
        ExpectedValue: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined]
    },
    {
        Root: new Map<string, any>([
            ['address', new Map<string, any>([
                ['address', 'test']
            ])]
        ]),
        Path: '$.address',
        ExpectedOk: 1,
        ExpectedValue: new Map<string, any>()
    }
]