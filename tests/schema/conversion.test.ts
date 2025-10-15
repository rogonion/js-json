import type {TestData} from '@internal'
import {Conversion, type Converter, type Converters, DataKinds, DynamicSchemaNode, type Schema} from '@schema'
import {DynamicUserSchema, User, UserWithAddress, UserWithAddressSchema} from '../misc.ts'
import {describe, expect, it} from 'vitest'
import {CollectionMemberSegment, JsonpathKeyRoot} from '@path'
import {JSONstringify} from '@core'
import {AreEqual} from '@object'

describe('conversion', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Expect $TestTitle to return $ExpectedOk', (testData) => {
        let result: any
        try {
            const conversion: Converter = new Conversion(testData.Converters)
            result = conversion.Convert(testData.Source, testData.Schema, [CollectionMemberSegment.create().WithKey(JsonpathKeyRoot).WithIsKeyRoot(true).build()])
            expect(areEqual.AreEqual(result, testData.ExpectedData)).toBe(testData.ExpectedOk)
        } catch (e) {
            if (testData.ExpectedOk) {
                console.log(
                    'Test Title:', testData.TestTitle, '\n',
                    'expected ok=', testData.ExpectedOk, '\n',
                    'schema=', JSONstringify(testData.Schema), '\n',
                    'source=', JSONstringify(testData.Source), '\n',
                    'result=', JSONstringify(result), '\n',
                    'ExpectedData=', JSONstringify(testData.ExpectedData), '\n'
                )
                throw e
            }
        }
    })
})

interface ConversionData extends TestData {
    Schema: Schema
    Source: any
    Converters?: Converters
    ExpectedOk: boolean
    ExpectedData: any
}

class Custom {
    public One: boolean = false
    public Two?: any[]
    public Three: string = ''
    public Four: number = 0
}

const TestData: ConversionData[] = [
    {
        Schema: DynamicUserSchema(),
        Source: {
            'ID': '1',
            'Name': 'John Doe',
            'Email': 'john.doe@email.com'
        },
        ExpectedOk: true,
        ExpectedData: (() => {
            const x = new User()
            x.ID = 1
            x.Name = 'John Doe'
            x.Email = 'john.doe@email.com'
            return x
        })()
    },
    {
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Map)
            .withTypeOf(typeof new Map())
            .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create()
                .withKind(DataKinds.Number)
                .withTypeOf(typeof 0)
                .build())
            .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create()
                .withKind(DataKinds.Number)
                .withTypeOf(typeof 0)
                .build())
            .build(),
        Source: {
            '1': '1',
            '2': '2',
            '3': '3'
        },
        ExpectedOk: true,
        ExpectedData: new Map<number, number>([[1, 1], [2, 2], [3, 3]])
    },
    {
        Schema: DynamicSchemaNode.create().withKind(DataKinds.Number).withTypeOf(typeof 0).build(),
        Source: '123',
        ExpectedOk: true,
        ExpectedData: 123
    },
    {
        Schema: DynamicSchemaNode.create().withKind(DataKinds.String).withTypeOf(typeof '').build(),
        Source: 456,
        ExpectedOk: true,
        ExpectedData: '456'
    },
    {
        Schema: DynamicSchemaNode.create().withKind(DataKinds.Boolean).withTypeOf(typeof true).build(),
        Source: 25,
        ExpectedOk: true,
        ExpectedData: true
    },
    {
        Schema: UserWithAddressSchema(),
        Source: new Map<string, any>([
            ['Name', 'Bob'],
            ['Address', {
                'Street': '123 Main St',
                'City': 'Anytown'
            }]
        ]),
        ExpectedOk: true,
        ExpectedData: (() => {
            const x = new UserWithAddress()
            x.Name = 'Bob'
            x.Address.Street = '123 Main St'
            x.Address.City = 'Anytown'
            return x
        })()
    },
    {
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Object)
            .withTypeOf(typeof new Custom())
            .withDefaultValue(() => {
                return new Custom()
            })
            .withChildNodes(
                new Map<string, Schema>([
                    ['One', DynamicSchemaNode.create().withKind(DataKinds.Boolean).withTypeOf(typeof true).build()],
                    ['Two', DynamicSchemaNode.create()
                        .withKind(DataKinds.Array)
                        .withTypeOf(typeof [1, '2'])
                        .withChildNodesLinearCollectionElementsSchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
                        .build()
                    ],
                    ['Three', DynamicSchemaNode.create().withKind(DataKinds.String).withTypeOf(typeof '').build()],
                    ['Four', DynamicSchemaNode.create().withKind(DataKinds.Number).withTypeOf(typeof 0).build()]
                ])
            )
            .build(),
        Source: {
            'One': true,
            'Two': [1, 2, 3],
            'Three': 'three',
            'Four': '4'
        },
        ExpectedOk: true,
        ExpectedData: (() => {
            const x = new Custom()
            x.One = true
            x.Two = [1, 2, 3]
            x.Three = 'three'
            x.Four = 4
            return x
        })()
    },
    {
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Object)
            .withTypeOf(typeof {})
            .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create().withKind(DataKinds.String).withTypeOf(typeof '').build())
            .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
            .build(),
        Source: (() => {
            const x = new Custom()
            x.One = true
            x.Two = [1, 2, 3]
            x.Three = 'three'
            x.Four = 4
            return x
        })(),
        ExpectedOk: true,
        ExpectedData: {
            'One': true,
            'Two': [1, 2, 3],
            'Three': 'three',
            'Four': 4
        }
    },
    {
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Set)
            .withTypeOf(typeof new Set<number>())
            .withDefaultValue(() => {
                return new Set<number>()
            })
            .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create().withKind(DataKinds.Number).withTypeOf(typeof 0).build())
            .build(),
        Source: [1, 2, 3, 1, 2, 3],
        ExpectedOk: true,
        ExpectedData: new Set<number>([1, 2, 3])
    },
    {
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Array)
            .withTypeOf(typeof [1, '2'])
            .withChildNodesLinearCollectionElementsSchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
            .build(),
        Source: new Set<any>([
            {1: 1},
            2,
            {
                'One': true,
                'Two': [1, 2, 3],
                'Three': 'three',
                'Four': 4
            }
        ]),
        ExpectedOk: true,
        ExpectedData: [
            {1: 1},
            2,
            {
                'One': true,
                'Two': [1, 2, 3],
                'Three': 'three',
                'Four': 4
            }
        ]
    }
]