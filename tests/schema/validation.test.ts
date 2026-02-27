import { TestData } from '@internal';
import { DataKind, DynamicSchemaNode, Validation, type Schema, type Validators } from '@schema';
import { describe, it } from 'vitest';
import {
    DynamicUserSchema,
    ListOfNestedItemSchema,
    ListOfProductsSchema,
    MapUserSchema,
    NestedItem,
    Pgxuuid,
    Product,
    User,
    UserProfile2,
    UserWithUuidId,
    UserWithUuidIdSchema,
    UUID
} from './misc';

class ValidationData extends TestData {
    public Schema!: Schema;
    public Data: any;
    public ValidateOnFirstMatch: boolean = true;
    public Validators?: Validators;
    public ExpectedOk: boolean = true;
}

describe('Schema Validation', () => {
    it.each(testData)('$TestTitle', (data) => {
        const validator = new Validation();
        validator.ValidateOnFirstMatch = data.ValidateOnFirstMatch;
        if (data.Validators) {
            validator.CustomValidators = data.Validators;
        }

        let ok = false;
        let err: any;

        try {
            ok = validator.ValidateData(data.Data, data.Schema);
        } catch (e) {
            err = e;
            ok = false;
        }

        if (ok !== data.ExpectedOk) {
            console.error(
                data.TestTitle,
                '\n',
                'expected ok=',
                data.ExpectedOk,
                'got=',
                ok,
                '\n',
                'schema=',
                JSON.stringify(data.Schema),
                '\n',
                'data=',
                JSON.stringify(data.Data),
                '\n',
                'error=',
                err
            );
            if (err) throw err;
            throw new Error(`Validation result mismatch. Expected ${data.ExpectedOk}, got ${ok}`);
        }
    });
});

const testData: ValidationData[] = [
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 1: Validate simple primitive',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.String
        }),
        Data: 'this is a string',
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 2: Validate invalid simple primitive',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Number
        }),
        Data: 'not a number', // JS doesn't distinguish int/float like Go, so string is invalid
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 3: test valid data',
        Schema: DynamicUserSchema(),
        Data: new User(1, 'John Doe', 'john@example.com'),
        ValidateOnFirstMatch: true,
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 4: test invalid data',
        Schema: DynamicUserSchema(),
        Data: 123,
        ValidateOnFirstMatch: true,
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 5: test valid list of products',
        Schema: ListOfProductsSchema(),
        Data: [new Product(1, 'Laptop', 1200.0), new Product(2, 'R2-D2', 25.5)],
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 6: test invalid value in list of products',
        Schema: ListOfProductsSchema(),
        Data: [new Product(1, 'Laptop', 1200.0), new Product(2, 'R2-D2', 25.5), 12],
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 7: test valid map of users',
        Schema: MapUserSchema(),
        Data: new Map([
            [1, new User(1, 'John Doe', 'john@example.com')],
            [2, new User(2, 'R2-D2', 'r2d2@email.com')]
        ]),
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 8: test invalid value in map',
        Schema: MapUserSchema(),
        Data: new Map<number, any>([
            [1, new User(1, 'John Doe', 'john@example.com')],
            [2, new User(2, 'R2-D2', 'r2d2@email.com')],
            [3, 'invalid value']
        ]),
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 9: test map of any value type',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Map,
            ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({
                Kind: DataKind.String
            }),
            ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({
                Kind: DataKind.Any
            })
        }),
        Data: new Map<string, any>([
            ['name', 'John Doe'],
            ['age', 12],
            ['isStudent', true]
        ]),
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 10: test deeply nested data',
        Schema: ListOfNestedItemSchema(),
        Data: [
            new NestedItem(
                1,
                new Map<string, any>([
                    ['name', 'Item A'],
                    [
                        'properties',
                        new Map<string, any>([
                            ['size', 10],
                            ['color', 'red']
                        ])
                    ]
                ]),
                ['value1', 123, true, new Map([['nestedKey', 'nestedValue']])]
            ),
            new NestedItem(
                2,
                new Map<string, any>([
                    ['name', 'Item B'],
                    [
                        'properties',
                        new Map<string, any>([
                            ['size', 20],
                            ['color', 'blue']
                        ])
                    ]
                ]),
                [new Map([['anotherKey', 'anotherValue']]), 'value2', 456]
            )
        ],
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 11: testing with global uuid custom validator for valid value',
        Schema: UserWithUuidIdSchema(),
        Data: new UserWithUuidId(
            new UUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
            new UserProfile2('John Doe', 12, 'USA', 'busy')
        ),
        Validators: {
            UUID: Pgxuuid
        },
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 12: testing with node specific uuid custom validator for invalid nil value',
        Schema: UserWithUuidIdSchema(),
        Data: new UserWithUuidId(
            null, // Invalid because schema expects UUID object and validator checks it
            new UserProfile2('John Doe', 12, 'USA', 'busy')
        ),
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 13: Validate tuple (slice with specific schemas at indices)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodes: {
                '0': new DynamicSchemaNode({ Kind: DataKind.String }),
                '1': new DynamicSchemaNode({ Kind: DataKind.Number })
            },
            ChildNodesLinearCollectionElementsSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
        }),
        Data: ['Title', 42, true],
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 14: Validate mixed map (specific keys + generic rest)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Map,
            ChildNodes: {
                id: new DynamicSchemaNode({ Kind: DataKind.Number })
            },
            ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.String }),
            ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.String })
        }),
        Data: new Map<string, any>([
            ['id', 101],
            ['description', 'generic']
        ]),
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 15: Validate Nilable=true',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.String,
            Nullable: true
        }),
        Data: null,
        ExpectedOk: true
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 16: Validate Nilable=false (default)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.String
        }),
        Data: null,
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 17: Validate strict map (ChildNodesMustBeValid=true) with missing key',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Map,
            ChildNodes: {
                required_key: new DynamicSchemaNode({ Kind: DataKind.String })
            },
            ChildNodesMustBeValid: true
        }),
        Data: new Map([['other_key', 'value']]),
        ExpectedOk: false
    }),
    Object.assign(new ValidationData(), {
        TestTitle: 'Test Case 18: Validate fixed-size Array',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodesLinearCollectionElementsSchema: new DynamicSchemaNode({ Kind: DataKind.Number })
        }),
        Data: [1, 2, 3],
        ExpectedOk: true
    })
];
