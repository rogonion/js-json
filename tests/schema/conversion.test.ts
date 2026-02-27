import { TestData } from '@internal';
import { AreEqual } from '@object';
import { Conversion, DataKind, DynamicSchemaNode, type Converters, type Schema } from '@schema';
import { describe, expect, it } from 'vitest';
import {
    Address,
    AddressSchema,
    DynamicUserSchema,
    User,
    UserProfile2,
    UserProfile2Schema,
    UserWithAddress,
    UserWithAddressSchema,
    UserWithUuidId,
    UserWithUuidIdSchema,
    UUID
} from './misc';

class ConversionData extends TestData {
    public Schema!: Schema;
    public Source: any;
    public Converters?: Converters;
    public ExpectedOk: boolean = true;
    public ExpectedData: any;
}

describe('Schema Conversion', () => {
    const areEqual = new AreEqual();

    it.each(testData)('$TestTitle', (data) => {
        const converter = new Conversion();
        if (data.Converters) {
            converter.CustomConverters = data.Converters;
        }

        let err: any;
        let res: any;

        try {
            res = converter.Convert(data.Source, data.Schema);
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
                'data=',
                JSON.stringify(data.Source),
                '\n'
            );
            throw err;
        } else if (!data.ExpectedOk && !err) {
            throw new Error(`Expected error but got success for ${data.TestTitle}`);
        } else if (data.ExpectedOk) {
            expect(areEqual.AreEqual(res, data.ExpectedData)).toBe(true);
        }
    });

    it('TestSchema_ConvertStoreResultInTypedDestination', () => {
        const cvt = new Conversion();

        const schema = new DynamicSchemaNode({
            Kind: DataKind.BigInt
        });

        // In TS we return the value, we don't write to a pointer like Go.
        // We verify the type and value.
        const numberCast = cvt.Convert(0.0, schema);
        expect(typeof numberCast).toBe('bigint');
        expect(numberCast).toBe(0n);

        const addressSchema = AddressSchema();
        const address = cvt.Convert({ Street: 'Turnkit Boulevard', City: 'NewYork', ZipCode: '1234' }, addressSchema);
        expect(address).toEqual(new Address('Turnkit Boulevard', 'NewYork', '1234'));
    });
});

const helloFunc = () => 'hello';

const testData: ConversionData[] = [
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 1: Map to User Object (Dynamic Schema)',
        Schema: DynamicUserSchema(),
        Source: {
            Name: 'Bob',
            Address: {
                Street: '123 Main St',
                City: 'Anytown'
            }
        },
        ExpectedOk: true,
        ExpectedData: new UserWithAddress('Bob', new Address('123 Main St', 'Anytown', null))
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 1b: Map to User Object (Dynamic Schema - Non-default node)',
        Schema: DynamicUserSchema(),
        Source: {
            ID: 1,
            Name: 'John Doe',
            Email: 'john.doe@email.com'
        },
        ExpectedOk: true,
        ExpectedData: new User(1, 'John Doe', 'john.doe@email.com')
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 2: Map to Map (String keys to Number keys/values)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Map,
            ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.Number }),
            ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.Number })
        }),
        Source: {
            '1': '1',
            '2': '2',
            '3': '3'
        },
        ExpectedOk: true,
        ExpectedData: new Map([
            [1, 1],
            [2, 2],
            [3, 3]
        ])
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 3: String to Int',
        Schema: new DynamicSchemaNode({ Kind: DataKind.Number }),
        Source: '123',
        ExpectedOk: true,
        ExpectedData: 123
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 4: Int to String',
        Schema: new DynamicSchemaNode({ Kind: DataKind.String }),
        Source: 456,
        ExpectedOk: true,
        ExpectedData: '456'
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 5: Float to Int (Number)',
        Schema: new DynamicSchemaNode({ Kind: DataKind.Number }),
        Source: 123.45,
        ExpectedOk: true,
        ExpectedData: 123.45 // JS Number is float, so it preserves decimals
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 6: String to Float',
        Schema: new DynamicSchemaNode({ Kind: DataKind.Number }),
        Source: '25.7',
        ExpectedOk: true,
        ExpectedData: 25.7
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 7: Int to Bool',
        Schema: new DynamicSchemaNode({ Kind: DataKind.Boolean }),
        Source: 25,
        ExpectedOk: true,
        ExpectedData: true
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 8: Nested Map to Object',
        Schema: UserWithAddressSchema(),
        Source: {
            Name: 'Bob',
            Address: {
                Street: '123 Main St',
                City: 'Anytown'
            }
        },
        ExpectedOk: true,
        ExpectedData: new UserWithAddress('Bob', new Address('123 Main St', 'Anytown', null))
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 9: Array to Slice (Array)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodesLinearCollectionElementsSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
        }),
        Source: [1, 'two', true],
        ExpectedOk: true,
        ExpectedData: [1, 'two', true]
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 11: Custom Object Structure',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Object,
            ChildNodes: {
                One: new DynamicSchemaNode({ Kind: DataKind.Boolean }),
                Two: new DynamicSchemaNode({
                    Kind: DataKind.Array,
                    ChildNodesLinearCollectionElementsSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
                }),
                Three: new DynamicSchemaNode({ Kind: DataKind.String }),
                Four: new DynamicSchemaNode({ Kind: DataKind.Number })
            }
        }),
        Source: {
            One: true,
            Two: [1, 2, 3],
            Three: 'three',
            Four: '4'
        },
        ExpectedOk: true,
        ExpectedData: {
            One: true,
            Two: [1, 2, 3],
            Three: 'three',
            Four: 4
        }
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 13: Convert JSON string directly to Object',
        Schema: UserProfile2Schema(),
        Source: `{"Name": "James Bond", "Age": 40, "Country": "UK", "Occupation": "Agent"}`,
        ExpectedOk: true,
        ExpectedData: new UserProfile2('James Bond', 40, 'UK', 'Agent')
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 15: Convert using Custom Converter (UUID string to UUID class)',
        Schema: UserWithUuidIdSchema(),
        Source: {
            ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            Profile: {
                Name: 'Alice',
                Age: 30,
                Country: 'Wonderland',
                Occupation: 'Explorer'
            }
        },
        ExpectedOk: true,
        ExpectedData: new UserWithUuidId(
            new UUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
            new UserProfile2('Alice', 30, 'Wonderland', 'Explorer')
        )
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 16: String to BigInt',
        Schema: new DynamicSchemaNode({ Kind: DataKind.BigInt }),
        Source: '9007199254740991',
        ExpectedOk: true,
        ExpectedData: 9007199254740991n
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 17: Number to BigInt',
        Schema: new DynamicSchemaNode({ Kind: DataKind.BigInt }),
        Source: 123,
        ExpectedOk: true,
        ExpectedData: 123n
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 18: String to Symbol',
        Schema: new DynamicSchemaNode({ Kind: DataKind.Symbol }),
        Source: 'mySymbol',
        ExpectedOk: true,
        ExpectedData: Symbol.for('mySymbol')
    }),
    Object.assign(new ConversionData(), {
        TestTitle: 'Test Case 19: Function passthrough',
        Schema: new DynamicSchemaNode({ Kind: DataKind.Function }),
        Source: helloFunc,
        ExpectedOk: true,
        ExpectedData: helloFunc
    })
];
