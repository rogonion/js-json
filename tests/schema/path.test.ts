import { TestData } from '@internal';
import { DataKind, DynamicSchemaNode, GetSchemaAtPath, type Schema, type SchemaPath } from '@schema';
import { describe, expect, it } from 'vitest';
import {
    CompanySchema,
    EmployeeSchema,
    JsonMapSchema,
    ListOfShapesSchema,
    ShapeSchema,
    UserWithAddressSchema
} from './misc';

class GetSchemaAtPathData extends TestData {
    public Schema!: Schema;
    public Path!: SchemaPath;
    public ExpectedOk: boolean = true;
    public ExpectedData?: DynamicSchemaNode;
}

describe('GetSchemaAtPath', () => {
    it.each(testData)('$TestTitle', (data) => {
        let err: any;
        let res: any;

        try {
            res = GetSchemaAtPath(data.Path, data.Schema);
        } catch (e) {
            err = e;
        }

        if (data.ExpectedOk && err) {
            console.error(
                data.TestTitle,
                '\n',
                'expected ok=',
                data.ExpectedOk,
                'got error=',
                err,
                '\n',
                'schema=',
                JSON.stringify(data.Schema),
                '\n',
                'path=',
                data.Path,
                '\n'
            );
            throw err;
        } else if (!data.ExpectedOk && !err) {
            throw new Error(`Expected error but got success for ${data.TestTitle}`);
        } else if (data.ExpectedOk) {
            expect(res).toEqual(data.ExpectedData);
        }
    });
});

const testData: GetSchemaAtPathData[] = [
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 1: Map Value Schema',
        Schema: JsonMapSchema(),
        Path: '$.Name',
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Any,
            AssociativeCollectionEntryKeySchema: new DynamicSchemaNode({
                Kind: DataKind.String
            })
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 2: Nested Map/Array Schema',
        Schema: JsonMapSchema(),
        Path: '$.Addresses[1].Zipcode',
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Any
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 3: Polymorphic Schema (Shape)',
        Schema: ShapeSchema(),
        Path: '$.Side',
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Number
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 4: Nested Object Schema',
        Schema: UserWithAddressSchema(),
        Path: '$.Address.ZipCode',
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.String,
            Nullable: true
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 5: Array of Pointers Schema',
        Schema: CompanySchema(),
        Path: '$.Employees[2].ID',
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Number,
            DefaultValue: expect.any(Function)
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 6: Map with specific Key Schema',
        Schema: EmployeeSchema(),
        Path: "$.ProjectHours['1']",
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Number,
            AssociativeCollectionEntryKeySchema: new DynamicSchemaNode({
                Kind: DataKind.String
            })
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 7: Map Value Schema (Recursive)',
        Schema: EmployeeSchema(),
        Path: "$.ProjectHours['1'].two",
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Number
        })
    }),
    Object.assign(new GetSchemaAtPathData(), {
        TestTitle: 'Test Case 8: List of Polymorphic Shapes',
        Schema: ListOfShapesSchema(),
        Path: '$[1].Radius',
        ExpectedOk: true,
        ExpectedData: new DynamicSchemaNode({
            Kind: DataKind.Number
        })
    })
];
