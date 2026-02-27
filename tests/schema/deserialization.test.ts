import { TestData } from '@internal';
import { AreEqual } from '@object';
import { DataKind, Deserialization, DynamicSchemaNode, type Converters, type Schema } from '@schema';
import { describe, expect, it } from 'vitest';
import { Circle, ShapeSchema, Square, UserProfile2, UserWithUuidId, UserWithUuidIdSchema, UUID } from './misc';

class DeserializeData extends TestData {
    public Schema!: Schema;
    public Source!: string;
    public Converters?: Converters;
    public ExpectedOk: boolean = true;
    public ExpectedData: any;
}

describe('Schema Deserialization', () => {
    const areEqual = new AreEqual();

    describe('FromJSON', () => {
        it.each(jsonData)('$TestTitle', (data) => {
            const deserializer = new Deserialization();
            if (data.Converters) {
                deserializer.CustomConverters = data.Converters;
            }

            let err: any;
            let res: any;

            try {
                res = deserializer.FromJSON(data.Source, data.Schema);
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
                    data.Source,
                    '\n'
                );
                throw err;
            } else if (!data.ExpectedOk && !err) {
                throw new Error(`Expected error but got success for ${data.TestTitle}`);
            } else if (data.ExpectedOk) {
                expect(areEqual.AreEqual(res, data.ExpectedData)).toBe(true);
            }
        });
    });

    describe('FromYAML', () => {
        it.each(yamlData)('$TestTitle', (data) => {
            const deserializer = new Deserialization();
            if (data.Converters) {
                deserializer.CustomConverters = data.Converters;
            }

            let err: any;
            let res: any;

            try {
                res = deserializer.FromYAML(data.Source, data.Schema);
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
                    data.Source,
                    '\n'
                );
                throw err;
            } else if (!data.ExpectedOk && !err) {
                throw new Error(`Expected error but got success for ${data.TestTitle}`);
            } else if (data.ExpectedOk) {
                expect(areEqual.AreEqual(res, data.ExpectedData)).toBe(true);
            }
        });
    });
});

const jsonData: DeserializeData[] = [
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 1: Simple Map',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Map,
            ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.String }),
            ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
        }),
        Source: `
            {
                "name": "Test User",
                "id": 101,
                "is_active": true,
                "tags": ["alpha", "beta", "gamma"]
            }`,
        ExpectedOk: true,
        ExpectedData: new Map<string, any>([
            ['name', 'Test User'],
            ['id', 101],
            ['is_active', true],
            ['tags', ['alpha', 'beta', 'gamma']]
        ])
    }),
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 2: List of Shapes (Polymorphic)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodesLinearCollectionElementsSchema: ShapeSchema()
        }),
        Source: `
            [
                { "Radius": 5.0 },
                { "Side": 10.0 },
                { "Radius": 7.5 }
            ]`,
        ExpectedOk: true,
        ExpectedData: [new Circle(5.0), new Square(10.0), new Circle(7.5)]
    }),
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 3: List of Shapes (Invalid Shape)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodesLinearCollectionElementsSchema: ShapeSchema()
        }),
        Source: `
            [
                { "Radius": 5.0 },
                { "Base": 10.0 }
            ]`,
        ExpectedOk: false
    }),
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 4: User with UUID',
        Schema: UserWithUuidIdSchema(),
        Source: `{"ID": "c1f20d6c-6a1e-4b9a-8a4b-91d5a7d7d5a7","Profile": {"Name": "Jane","Country":"Kenya", "Age": 28,"Occupation": "Manager"}}`,
        ExpectedOk: true,
        ExpectedData: new UserWithUuidId(
            new UUID('c1f20d6c-6a1e-4b9a-8a4b-91d5a7d7d5a7'),
            new UserProfile2('Jane', 28, 'Kenya', 'Manager')
        )
    })
];

const yamlData: DeserializeData[] = [
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 1: Simple Map (YAML)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Map,
            ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({ Kind: DataKind.String }),
            ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({ Kind: DataKind.Any })
        }),
        Source: `
name: Test User
id: 101
is_active: true
tags:
- alpha
- beta
- gamma
`,
        ExpectedOk: true,
        ExpectedData: new Map<string, any>([
            ['name', 'Test User'],
            ['id', 101],
            ['is_active', true],
            ['tags', ['alpha', 'beta', 'gamma']]
        ])
    }),
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 2: List of Shapes (Polymorphic YAML)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodesLinearCollectionElementsSchema: ShapeSchema()
        }),
        Source: `
- Radius: 5
- Side: 10
- Radius: 7.5
`,
        ExpectedOk: true,
        ExpectedData: [new Circle(5.0), new Square(10.0), new Circle(7.5)]
    }),
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 3: List of Shapes (Invalid Shape YAML)',
        Schema: new DynamicSchemaNode({
            Kind: DataKind.Array,
            ChildNodesLinearCollectionElementsSchema: ShapeSchema()
        }),
        Source: `
- Radius: 5
- Base: 10
`,
        ExpectedOk: false
    }),
    Object.assign(new DeserializeData(), {
        TestTitle: 'Test Case 4: User with UUID (YAML)',
        Schema: UserWithUuidIdSchema(),
        Source: `
ID: c1f20d6c-6a1e-4b9a-8a4b-91d5a7d7d5a7
Profile:
    Name: Jane
    Age: 28
    Country: Kenya
    Occupation: Manager
`,
        ExpectedOk: true,
        ExpectedData: new UserWithUuidId(
            new UUID('c1f20d6c-6a1e-4b9a-8a4b-91d5a7d7d5a7'),
            new UserProfile2('Jane', 28, 'Kenya', 'Manager')
        )
    })
];
