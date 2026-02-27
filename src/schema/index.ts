/**
 * Package schema provides tools for defining, validating, converting, and deserializing data structures.
 *
 * It allows you to define a "Schema" (using {@link DynamicSchema} or {@link DynamicSchemaNode}) that describes the expected structure and types of your data.
 * This is particularly useful for working with dynamic or semi-structured data where compile-time types might be `any` or `Record<string, any>`, but a specific structure is enforced at runtime.
 *
 * Key features:
 * - **Definition**: Define schemas for primitives, objects, maps, sets, and arrays.
 * - **Validation**: Check if a piece of data matches a defined schema.
 * - **Conversion**: Convert raw data (e.g., `Record<string, any>` from JSON) into strongly-typed structures based on the schema.
 * - **Deserialization**: Specific helpers for JSON and YAML that combine parsing and conversion.
 * - **Path Traversal**: Retrieve the schema definition for a specific node within a larger schema using JSONPath.
 *
 * # Core Concepts
 *
 * - **{@link DynamicSchemaNode}**: Represents a single node in the schema tree (e.g., a field, a map value, an array element).
 * - **{@link DynamicSchema}**: Represents a collection of possible schemas (often used for root objects or polymorphic types).
 *
 * # Usage
 *
 * ## Conversion
 *
 * To convert data (e.g. a map) into a struct based on a schema:
 *
 * 1. Create a new instance of the {@link Conversion} class.
 * 2. Call the `Convert` method.
 *
 * You can register custom converters for specific types using `CustomConverters`.
 *
 * @example
 * ```typescript
 * import { DynamicSchemaNode, DataKind, Conversion } from '@schema';
 *
 * const schema = new DynamicSchemaNode({
 *     // Define a Map<number, number> schema
 *     Kind: DataKind.Map,
 *     ChildNodesAssociativeCollectionEntriesKeySchema: new DynamicSchemaNode({
 *         Kind: DataKind.Number
 *     }),
 *     ChildNodesAssociativeCollectionEntriesValueSchema: new DynamicSchemaNode({
 *         Kind: DataKind.Number
 *     })
 * });
 *
 * const source = {
 *     "1": "1",
 *     "2": "2",
 *     "3": "3"
 * };
 *
 * const converter = new Conversion();
 * const destination = converter.Convert(source, schema);
 * ```
 *
 * ## Deserialization
 *
 * The module will first parse the raw data (JSON/YAML) into a generic structure (map/array/any) and then convert it to the destination type using the provided schema.
 *
 * 1. Create a new instance of {@link Deserialization}.
 * 2. Call `FromJSON` or `FromYAML`.
 *
 * @example
 * ```typescript
 * import { Deserialization, DynamicSchemaNode, DataKind } from '@schema';
 *
 * const deserializer = new Deserialization();
 *
 * const schema = new DynamicSchemaNode({
 *     Kind: DataKind.Object,
 *     ChildNodes: {
 *         "Name": new DynamicSchemaNode({
 *             Kind: DataKind.String
 *         }),
 *         "Age": new DynamicSchemaNode({
 *             Kind: DataKind.Number
 *         }),
 *         "Country": new DynamicSchemaNode({
 *             Kind: DataKind.String
 *         }),
 *         "Occupation": new DynamicSchemaNode({
 *             Kind: DataKind.String
 *         })
 *     }
 * });
 *
 * const json = '{"Name":"John Doe"}';
 * const jsonDestination = deserializer.FromJSON(json, schema);
 *
 * const yaml = 'Name: John Doe';
 * const yamlDestination = deserializer.FromYAML(yaml, schema);
 * ```
 *
 * ## Validation
 *
 * To check if data adheres to a schema without converting it:
 *
 * @example
 * ```typescript
 * import { DynamicSchemaNode, DataKind, Validation } from '@schema';
 *
 * const schema = new DynamicSchemaNode({
 *     Kind: DataKind.String
 * });
 *
 * const validation = new Validation();
 * const ok = validation.ValidateData("this is a string", schema);
 * ```
 *
 * @packageDocumentation
 */
export * from './core';
export * from './path';
export * from './deserialization';
export * from './conversion';
export * from './validation';
