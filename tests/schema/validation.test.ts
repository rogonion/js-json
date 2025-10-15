import type {TestData} from '@internal'
import {DataKinds, DynamicSchemaNode, type Schema, Validation, type Validator, type Validators} from '@schema'
import {describe, expect, it} from 'vitest'
import {CollectionMemberSegment, JsonpathKeyRoot} from '@path'
import {
    CustomUUID,
    DynamicUserSchema,
    ListOfNestedItemSchema,
    ListOfProductsSchema,
    MapUserSchema,
    User,
    UserWithUuidId,
    UserWithUuidIdSchema
} from '../misc.ts'
import {JSONstringify} from '@core'

describe('validation', () => {
    it.each(TestData)('Expect $TestTitle to return $ExpectedOk', (testData) => {
        let ok = false
        try {
            const validator: Validator = new Validation(testData.ValidateOnFirstMatch, testData.Validators)
            ok = validator.ValidateData(testData.Data, testData.Schema, [CollectionMemberSegment.create().WithKey(JsonpathKeyRoot).WithIsKeyRoot(true).build()])
            expect(ok).toBe(testData.ExpectedOk)
        } catch (e) {
            if (ok !== testData.ExpectedOk) {
                console.log(
                    'Test Title:', testData.TestTitle, '\n',
                    'expected ok=', testData.ExpectedOk, 'got=', ok, '\n',
                    'schema=', JSONstringify(testData.Schema), '\n',
                    'data=', JSONstringify(testData.Data)
                )
                throw e
            }
        }
    })
})

interface ValidationData extends TestData {
    Schema: Schema
    Data: any
    ValidateOnFirstMatch?: boolean
    Validators?: Validators
    ExpectedOk: boolean
}

const TestData: ValidationData[] = [
    {
        TestTitle: 'Validation simple primitive',
        Schema: DynamicSchemaNode.create().withKind(DataKinds.String).withTypeOf(typeof '').build(),
        Data: 'this is a string',
        ExpectedOk: true
    },
    {
        TestTitle: 'Validation invalid simple primitive',
        Schema: DynamicSchemaNode.create().withKind(DataKinds.Number).withTypeOf(typeof 0).build(),
        Data: '0.0',
        ExpectedOk: false
    },
    {
        TestTitle: 'test valid data',
        Schema: DynamicUserSchema(),
        Data: (() => {
            const x = new User()
            x.ID = 1
            x.Name = 'John Doe'
            x.Email = 'john@example.com'
            return x
        })(),
        ValidateOnFirstMatch: true,
        ExpectedOk: true
    },
    {
        TestTitle: 'test invalid data',
        Schema: DynamicUserSchema(),
        Data: 123,
        ValidateOnFirstMatch: true,
        ExpectedOk: false
    },
    {
        TestTitle: 'test valid list of products',
        Schema: ListOfProductsSchema(),
        Data: [
            {
                ID: 1,
                Name: 'Laptop',
                Price: 1200.0
            },
            {
                ID: 2,
                Name: 'R2-D2',
                Price: 25.5
            }
        ],
        ExpectedOk: true
    },
    {
        TestTitle: 'test invalid value in list of products',
        Schema: ListOfProductsSchema(),
        Data: [
            {
                ID: 1,
                Name: 'Laptop',
                Price: 1200.0
            },
            {
                ID: 2,
                Name: 'R2-D2',
                Price: 25.5
            },
            12
        ],
        ExpectedOk: false
    },
    {

        TestTitle: 'test valid map of users',
        Schema: MapUserSchema(),
        Data: new Map<number, User>([
            [1, {
                ID: 1,
                Name: 'John Doe',
                Email: 'john@example.com'
            }],
            [2, {
                ID: 2,
                Name: 'R2-D2',
                Email: 'r2d2@email.com'
            }]
        ]),
        ExpectedOk: true
    },
    {

        TestTitle: 'test invalid value in map',
        Schema: MapUserSchema(),
        Data: new Map<number, any>([
            [1, {
                ID: 1,
                Name: 'John Doe',
                Email: 'john@example.com'
            }],
            [2, {
                ID: 2,
                Name: 'R2-D2',
                Email: 'r2d2@email.com'
            }],
            [3, 'invalid value']
        ]),
        ExpectedOk: false
    },
    {
        TestTitle: 'test map of any value type',
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Map)
            .withTypeOf(typeof new Map<string, any>())
            .withDefaultValue(() => {
                return new Map<string, any>()
            })
            .withIsDefaultValueSet(true)
            .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create().withKind(DataKinds.String).withTypeOf(typeof '').build())
            .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
            .build(),
        Data: new Map<string, any>([
            ['name', 'John Doe'],
            ['age', 12],
            ['isStudent', true]
        ]),
        ExpectedOk: true
    },
    {
        TestTitle: 'test deeply nested data',
        Schema: ListOfNestedItemSchema(),
        Data: [
            {
                ID: 1,
                MapData: {
                    'name': 'Item A',
                    'properties': {'size': 10, 'color': 'red'}
                },
                ListData: [
                    'value1',
                    123,
                    true,
                    {
                        'nestedKey': 'nestedValue'
                    }
                ]
            },

            {
                ID: 2,
                MapData: {
                    'name': 'Item B',
                    'properties': {'size': 20, 'color': 'blue'}
                },
                ListData: [
                    {
                        'anotherKey': 'anotherValue'
                    },
                    'value2',
                    456
                ]
            }
        ],
        ExpectedOk: true
    },
    {
        TestTitle: 'testing with global uuid custom validator for valid value',
        Schema: UserWithUuidIdSchema(),
        Data: (() => {
            const x = new UserWithUuidId()
            x.ID = CustomUUID.create().withUUIDFromString('36b8f84d-df4e-4d49-b662-bcde71a8764f')
            x.Profile.Name = 'John Doe'
            x.Profile.Age = 12
            x.Profile.Country = 'United States'
            x.Profile.Occupation = 'busy'
            return x
        })(),
        ExpectedOk: true
    },
    {
        TestTitle: 'testing with node specific uuid custom validator for invalid nil value',
        Schema: UserWithUuidIdSchema(),
        Data: (() => {
            const x = new UserWithUuidId()
            x.ID = CustomUUID.create()
            x.Profile.Name = 'John Doe'
            x.Profile.Age = 12
            x.Profile.Country = 'United States'
            x.Profile.Occupation = 'busy'
            return x
        })(),
        ExpectedOk: false
    },
    {
        TestTitle: 'testing set validation',
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Set)
            .withTypeOf(typeof new Set<number>())
            .withDefaultValue(() => {
                return new Set<number>()
            })
            .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create().withKind(DataKinds.Number).withTypeOf(typeof 0).build())
            .build(),
        Data: new Set<number>([1, 2, 3]),
        ExpectedOk: true
    }
]