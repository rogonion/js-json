import { describe, it, expect } from 'vitest';
import { DataKind, DynamicSchema, DynamicSchemaNode, GetDataKind } from '@schema';

describe('Schema Core', () => {
    describe('GetDataKind', () => {
        it('should identify primitive types', () => {
            expect(GetDataKind('string')).toBe(DataKind.String);
            expect(GetDataKind(123)).toBe(DataKind.Number);
            expect(GetDataKind(true)).toBe(DataKind.Boolean);
        });

        it('should identify collection types', () => {
            expect(GetDataKind([])).toBe(DataKind.Array);
            expect(GetDataKind(new Map())).toBe(DataKind.Map);
            expect(GetDataKind(new Set())).toBe(DataKind.Set);
            expect(GetDataKind({})).toBe(DataKind.Object);
        });

        it('should identify null/undefined as Any (or specific handling)', () => {
            // Based on implementation, null is object -> Object, undefined -> Any
            // Adjusting expectation based on IsObject check which excludes null
            expect(GetDataKind(undefined)).toBe(DataKind.Any);
            expect(GetDataKind(null)).toBe(DataKind.Any);
        });
    });

    describe('DynamicSchemaNode', () => {
        it('should create a new node with defaults', () => {
            const node = new DynamicSchemaNode();
            expect(node).toBeInstanceOf(DynamicSchemaNode);
            expect(node.IsSchema()).toBe(true);
            expect(node.Nullable).toBe(false);
        });

        it('should allow initialization with properties', () => {
            const node = new DynamicSchemaNode({
                Kind: DataKind.String,
                Nullable: true
            });
            expect(node.Kind).toBe(DataKind.String);
            expect(node.Nullable).toBe(true);
        });

        it('should serialize to JSON correctly', () => {
            const child = new DynamicSchemaNode({ Kind: DataKind.Number });
            const node = new DynamicSchemaNode({
                Kind: DataKind.Object,
                ChildNodes: { age: child }
            });

            const json = JSON.parse(JSON.stringify(node));
            expect(json.Kind).toBe('Object');
            expect(json.ChildNodes).toEqual({
                age: expect.objectContaining({ Kind: 'Number' })
            });
        });
    });

    describe('DynamicSchema', () => {
        it('should create a new schema with defaults', () => {
            const schema = new DynamicSchema();
            expect(schema).toBeInstanceOf(DynamicSchema);
            expect(schema.DefaultSchemaNodeKey).toBe('default');
            expect(schema.Nodes).toBeInstanceOf(Object);
        });

        it('should allow initialization with nodes', () => {
            const node = new DynamicSchemaNode({ Kind: DataKind.String });
            const schema = new DynamicSchema({
                Nodes: { default: node }
            });

            expect(schema.Nodes['default']).toBe(node);
        });

        it('should serialize to JSON correctly', () => {
            const node = new DynamicSchemaNode({ Kind: DataKind.String });
            const schema = new DynamicSchema({
                Nodes: { default: node },
                ValidSchemaNodeKeys: ['default']
            });

            const json = JSON.parse(JSON.stringify(schema));
            expect(json.DefaultSchemaNodeKey).toBe('default');
            expect(json.Nodes).toEqual({
                default: expect.objectContaining({ Kind: 'String' })
            });
        });
    });
});
