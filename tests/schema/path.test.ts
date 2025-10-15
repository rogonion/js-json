import type {TestData} from '@internal'
import {DataKinds, DynamicSchemaNode, type Schema, SchemaAtPath} from '@schema'
import type {JSONPath} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual} from '@object'
import {JSONstringify} from '@core'
import {
    CompanySchema,
    EmployeeSchema,
    JsonMapSchema,
    ListOfShapesSchema,
    ShapeSchema,
    UserWithAddressSchema
} from '../misc.ts'

describe('schema at path', () => {
    const areEqual = new AreEqual()

    it.each(TestData)('Expect $TestTitle to return $ExpectedOk', (testData) => {
        let result: any
        try {
            result = new SchemaAtPath().Get(testData.Path, testData.Schema)
            expect(areEqual.AreEqual(result, testData.ExpectedData)).toBe(testData.ExpectedOk)
        } catch (e) {
            if (testData.ExpectedOk) {
                console.log(
                    'Test Title:', testData.TestTitle, '\n',
                    'expected ok=', testData.ExpectedOk, '\n',
                    'schema=', JSONstringify(testData.Schema), '\n',
                    'path=', testData.Path, '\n',
                    'result=', JSONstringify(result), '\n',
                    'ExpectedData=', JSONstringify(testData.ExpectedData), '\n'
                )
                throw e
            }
        }
    })
})

interface SchemaAtPathData extends TestData {
    Schema: Schema
    Path: JSONPath
    ExpectedOk: boolean
    ExpectedData: DynamicSchemaNode
}

const TestData: SchemaAtPathData[] = [
    {
        Schema: JsonMapSchema(),
        Path: '$.Name',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Any)
            .withAssociativeCollectionEntryKeySchema(
                DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof 'key')
                    .build()
            )
            .build()
    },
    {
        Schema: JsonMapSchema(),
        Path: '$.Addresses[1].Zipcode',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Any)
            .build()
    },
    {
        Schema: ShapeSchema(),
        Path: '$.Side',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Number)
            .withTypeOf(typeof 0.0)
            .build()
    },
    {
        Schema: UserWithAddressSchema(),
        Path: '$.Address.ZipCode',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.String)
            .withTypeOf(typeof '')
            .withNullable(true)
            .build()
    },
    {
        Schema: CompanySchema(),
        Path: '$.Employees[2].ID',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Number)
            .withTypeOf(typeof 0)
            .build()
    },
    {
        Schema: EmployeeSchema(),
        Path: '$.ProjectHours[\'1\']',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Number)
            .withTypeOf(typeof 0.0)
            .withAssociativeCollectionEntryKeySchema(
                DynamicSchemaNode.create()
                    .withKind(DataKinds.String)
                    .withTypeOf(typeof 'key')
                    .build()
            )
            .build()
    },
    {
        Schema: EmployeeSchema(),
        Path: '$.ProjectHours[\'1\'].two',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Number)
            .withTypeOf(typeof 0.0)
            .build()
    },
    {
        Schema: ListOfShapesSchema(),
        Path: '$[1].Radius',
        ExpectedOk: true,
        ExpectedData: DynamicSchemaNode.create()
            .withKind(DataKinds.Number)
            .withTypeOf(typeof 0.0)
            .build()
    },
    {
        Schema: ListOfShapesSchema(),
        Path: '$[1].Angles',
        ExpectedOk: false,
        ExpectedData: DynamicSchemaNode.create().build()
    }
]