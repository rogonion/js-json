import type {TestData} from '@internal'
import {type Converters, DataKinds, Deserialization, DynamicSchemaNode, type Schema} from '@schema'
import {describe, expect, it} from 'vitest'
import {AreEqual} from '@object'
import {JSONstringify} from '@core'
import {Circle, CustomUUID, ListOfShapesSchema, Square, UserWithUuidId, UserWithUuidIdSchema} from '../misc.ts'

describe('deserialization from json', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Expect $TestTitle to return $ExpectedOk', (testData) => {
        let result: any
        try {
            const deserializer = new Deserialization(undefined, testData.Converters)
            result = deserializer.FromJSON(testData.Source, testData.Schema)
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

interface DeserializationData extends TestData {
    Schema: Schema
    Source: string
    Converters?: Converters
    ExpectedOk: boolean
    ExpectedData: any
}

const TestData: DeserializationData[] = [
    {
        Schema: DynamicSchemaNode.create()
            .withKind(DataKinds.Map)
            .withTypeOf(typeof new Map<string, any>())
            .withDefaultValue(() => {
                return new Map<string, any>()
            })
            .withChildNodesAssociativeCollectionEntriesKeySchema(DynamicSchemaNode.create()
                .withKind(DataKinds.String)
                .withTypeOf(typeof '')
                .build())
            .withChildNodesAssociativeCollectionEntriesValueSchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
            .build(),
        Source: `
            {
				"name": "Test User",
				"id": 101,
				"is_active": true,
				"tags": ["alpha", "beta", "gamma"]
			}`.trim(),
        ExpectedOk: true,
        ExpectedData: new Map<string, any>([
            ['name', 'Test User'],
            ['id', 101],
            ['is_active', true],
            ['tags', ['alpha', 'beta', 'gamma']]
        ])
    },
    {
        Schema: ListOfShapesSchema(),
        Source: `
			[
                { "Radius": 5.0 },
                { "Side": 10.0 },
                { "Radius": 7.5 }
            ]`.trim(),
        ExpectedOk: true,
        ExpectedData: [
            (() => {
                const x = new Circle()
                x.Radius = 5.0
                return x
            })(),
            (() => {
                const x = new Square()
                x.Side = 10.0
                return x
            })(),
            (() => {
                const x = new Circle()
                x.Radius = 7.5
                return x
            })()
        ]
    },
    {
        Schema: ListOfShapesSchema(),
        Source: `
			[
                { "Radius": 5.0 },
                { "Base": 10.0 }
            ]`.trim(),
        ExpectedOk: false,
        ExpectedData: []
    },
    {
        Schema: UserWithUuidIdSchema(),
        Source: `{"ID": "c1f20d6c-6a1e-4b9a-8a4b-91d5a7d7d5a7","Profile": {"Name": "Jane", "Age": 28,"Occupation": "Manager"}}`.trim(),
        ExpectedOk: true,
        ExpectedData: (() => {
            const x = new UserWithUuidId()
            x.ID = CustomUUID.create().withUUIDFromString('c1f20d6c-6a1e-4b9a-8a4b-91d5a7d7d5a7').build()
            x.Profile.Name = 'Jane'
            x.Profile.Age = 28
            x.Profile.Occupation = 'Manager'
            return x
        })()
    }
]