// @ts-expect-error 'JsonError' is declared but its value is never read.
import { IsArray, IsMap, IsObject, IsSet, JsonError } from '@core';
import type { JSONPath, RecursiveDescentSegment, RecursiveDescentSegments } from '@path';

/**
 * Represents a {@link JSONPath} both in its parsed and unparsed form.
 *
 * Ideally functions are expected to only work with a {@link JSONPath} with no recursive descent searches.
 */
export type SchemaPath = JSONPath | RecursiveDescentSegment | RecursiveDescentSegments;

/**
 * For performing deserialization of data from various source formats to a destination that adheres to the {@link Schema}.
 */
export interface Deserializer {
    /**
     * Deserializes JSON string using {@link Schema}.
     * @param data
     * @param schema
     * @throws {JsonError}
     */
    FromJSON(data: string, schema: Schema): any;

    /**
     * Deserializes YAML string using {@link Schema}.
     * @param data
     * @param schema
     * @throws {JsonError}
     */
    FromYAML(data: string, schema: Schema): any;
}

export interface DefaultConverter {
    /**
     * Called when schema of type {@link Schema} is encountered in the recursive conversion process.
     * @throws {JsonError}
     */
    RecursiveConvert(source: any, schema: Schema, pathSegments: RecursiveDescentSegment): any;

    /**
     * Entrypoint for conversion.
     * @throws {JsonError}
     */
    Convert(source: any, schema: Schema): any;

    /**
     *
     * @param source
     * @param schema
     * @throws {JsonError}
     */
    ConvertNode(source: any, schema: DynamicSchemaNode): any;
}

/**
 * Converter for defining custom conversion logic.
 *
 * Meant to be implemented by custom data types that need to perform specific value-based conversion beyond defaults.
 */
export interface Converter {
    /**
     * Convert converts data based on {@link Schema}.
     *
     * @param data The data to be converted.
     * @param schema The schema encountered to {@link DefaultConverter.RecursiveConvert} against.
     * @param pathSegments Current path segments where data was encountered.
     * @returns converted data.
     * @throws {JsonError}
     */
    Convert(data: any, schema: Schema, pathSegments: RecursiveDescentSegment): any;
}

/**
 * Map of custom converters with key representing unique `typeName`.
 */
export type Converters = { [key: string]: Converter };

export interface DefaultValidator {
    /**
     *
     * @param data
     * @param schema
     * @throws {JsonError}
     */
    ValidateData(data: any, schema: Schema): boolean;

    /**
     *
     * @param data
     * @param schema
     * @throws {JsonError}
     */
    ValidateNode(data: any, schema: DynamicSchemaNode): boolean;
}
/**
 * For defining custom data validation logic.
 *
 * Meant to be implemented by custom data types that need to perform specific value-based validation that goes beyond the defaults.
 */
export interface Validator {
    /**
     * ValidateData validates data against a {@link Schema} using custom rules.
     * @param data The data to be validated.
     * @param schema The schema encountered to be validated against with custom rules.
     * @param pathSegments Current Path segments where data was encountered.
     * @throws {JsonError}
     */
    ValidateData(data: any, schema: Schema, pathSegments: RecursiveDescentSegment): boolean;
}

/**
 * Map of custom validators with key representing unique `typeName`.
 */
export type Validators = { [key: string]: Validator };

/**
 * Represent a JSON-Like schema.
 */
export interface Schema {
    // Placeholder implementor that returns `true` to indicate that they represent a JSON-Like schema.
    IsSchema(): boolean;
}

/**
 * Distinct categories of types of data.
 */
export const DataKind = {
    String: 'String',
    Number: 'Number',
    Boolean: 'Boolean',
    BigInt: 'BigInt',
    Symbol: 'Symbol',
    Function: 'Function',
    Array: 'Array',
    Map: 'Map',
    Set: 'Set',
    Object: 'Object',
    Any: 'Any'
} as const;
export type DataKind = (typeof DataKind)[keyof typeof DataKind];
/**
 * Determines the DataKind of a given value.
 */
export function GetDataKind(v: any): DataKind {
    if (typeof v === 'string') return DataKind.String;
    if (typeof v === 'number') return DataKind.Number;
    if (typeof v === 'boolean') return DataKind.Boolean;
    if (typeof v === 'bigint') return DataKind.BigInt;
    if (typeof v === 'symbol') return DataKind.Symbol;
    if (typeof v === 'function') return DataKind.Function;
    if (IsArray(v)) return DataKind.Array;
    if (IsMap(v)) return DataKind.Map;
    if (IsSet(v)) return DataKind.Set;
    if (IsObject(v)) return DataKind.Object;
    return DataKind.Any;
}

export type ChildNodes = { [key: string]: Schema };

/**
 * Defines a single specific schema node.
 * It describes the type, kind, and structural constraints of a data node.
 */
export class DynamicSchemaNode implements Schema {
    /**
     * The underlying type of the data.
     * */
    private _Kind?: DataKind;
    public get Kind(): DataKind | undefined {
        return this._Kind;
    }
    public set Kind(value: DataKind | undefined) {
        this._Kind = value;
    }
    /**
     * The type of data. typically obtained using `typeof`.
     */
    private _TypeOf?: string;
    public get TypeOf(): string | undefined {
        return this._TypeOf;
    }
    public set TypeOf(value: string | undefined) {
        this._TypeOf = value;
    }
    /**
     * Optional default value to use for new initializations.
     *
     * Important for new values (like maps or user-defined classes) created recursively at each path segment.
     */
    private _DefaultValue?: () => any;
    public get DefaultValue(): (() => any) | undefined {
        return this._DefaultValue;
    }
    public set DefaultValue(value: (() => any) | undefined) {
        this._DefaultValue = value;
    }

    /**
     * Specifies whether the current value can be empty.
     * */
    private _Nullable: boolean = false;
    public get Nullable(): boolean {
        return this._Nullable;
    }
    public set Nullable(value: boolean) {
        this._Nullable = value;
    }
    /**
     * Specify a {@link Validator} for this specific node.
     * */
    private _Validator?: Validator;
    public get Validator(): Validator | undefined {
        return this._Validator;
    }
    public set Validator(value: Validator | undefined) {
        this._Validator = value;
    }
    /**
     * Specify {@link Converter} for this specific node.
     * */
    private _Converter?: Converter;
    public get Converter(): Converter | undefined {
        return this._Converter;
    }
    public set Converter(value: Converter | undefined) {
        this._Converter = value;
    }
    /**
     * A recursive map defining the schema for the following:
     * * Specific key-value entries in an associative collection like map.
     *
     *      For each entry, it is important to specify the key type using {@link ChildNodesAssociativeCollectionEntriesKeySchema}.
     *
     * * Specific elements at indexes in a linear collection like slice or array.
     * * All class top level members specifically those that are User defined.
     * */
    private _ChildNodes?: ChildNodes;
    public get ChildNodes(): ChildNodes | undefined {
        return this._ChildNodes;
    }
    public set ChildNodes(value: ChildNodes | undefined) {
        this._ChildNodes = value;
    }
    /**
     * {@link Schema} for all keys of entries in an associative collection. Mandatory if Kind is {@link DataKind.Dictionary}.
     * */
    private _ChildNodesAssociativeCollectionEntriesKeySchema?: Schema;
    public get ChildNodesAssociativeCollectionEntriesKeySchema(): Schema | undefined {
        return this._ChildNodesAssociativeCollectionEntriesKeySchema;
    }
    public set ChildNodesAssociativeCollectionEntriesKeySchema(value: Schema | undefined) {
        this._ChildNodesAssociativeCollectionEntriesKeySchema = value;
    }
    /**
     * {@link Schema} for all values of entries in an associative collection. Mandatory if Kind is {@link DataKind.Dictionary}.
     * */
    private _ChildNodesAssociativeCollectionEntriesValueSchema?: Schema;
    public get ChildNodesAssociativeCollectionEntriesValueSchema(): Schema | undefined {
        return this._ChildNodesAssociativeCollectionEntriesValueSchema;
    }
    public set ChildNodesAssociativeCollectionEntriesValueSchema(value: Schema | undefined) {
        this._ChildNodesAssociativeCollectionEntriesValueSchema = value;
    }
    /**
     * {@link Schema} for all elements in an array. Mandatory if Kind is {@link DataKind.Array}.
     * */
    private _ChildNodesLinearCollectionElementsSchema?: Schema;
    public get ChildNodesLinearCollectionElementsSchema(): Schema | undefined {
        return this._ChildNodesLinearCollectionElementsSchema;
    }
    public set ChildNodesLinearCollectionElementsSchema(value: Schema | undefined) {
        this._ChildNodesLinearCollectionElementsSchema = value;
    }
    /**
     * {@link Schema}  for node that is a specific entry in an associative collection.
     *
     * Ideally this means that the Kind in {@link ChildNodesAssociativeCollectionEntriesKeySchema} of the parent map is {@link DataKind.Any}.
     * */
    private _AssociativeCollectionEntryKeySchema?: Schema;
    public get AssociativeCollectionEntryKeySchema(): Schema | undefined {
        return this._AssociativeCollectionEntryKeySchema;
    }
    public set AssociativeCollectionEntryKeySchema(value: Schema | undefined) {
        this._AssociativeCollectionEntryKeySchema = value;
    }
    /**
     * Ensure all {@linkcode ChildNodes} are present and validated.
     * */
    private _ChildNodesMustBeValid: boolean = false;
    public get ChildNodesMustBeValid(): boolean {
        return this._ChildNodesMustBeValid;
    }
    public set ChildNodesMustBeValid(value: boolean) {
        this._ChildNodesMustBeValid = value;
    }

    constructor(init?: Partial<DynamicSchemaNode>) {
        if (init) {
            Object.assign(this, init);
        }
    }

    public IsSchema(): boolean {
        return true;
    }

    public static fromJSON(json: string | object): DynamicSchemaNode {
        let data: any = json;
        if (typeof json === 'string') {
            data = JSON.parse(json);
        }

        const instance = new DynamicSchemaNode();
        if (data) {
            if (data.Kind) instance.Kind = data.Kind;
            if (data.TypeOf) instance.TypeOf = data.TypeOf;
            if (typeof data.Nullable === 'boolean') instance.Nullable = data.Nullable;
            if (typeof data.ChildNodesMustBeValid === 'boolean') instance.ChildNodesMustBeValid = data.ChildNodesMustBeValid;

            if (data.ChildNodes) {
                instance.ChildNodes = {};
                for (const key in data.ChildNodes) {
                    instance.ChildNodes[key] = SchemaFromJSON(data.ChildNodes[key]);
                }
            }
            if (data.ChildNodesAssociativeCollectionEntriesKeySchema) {
                instance.ChildNodesAssociativeCollectionEntriesKeySchema = SchemaFromJSON(
                    data.ChildNodesAssociativeCollectionEntriesKeySchema
                );
            }
            if (data.ChildNodesAssociativeCollectionEntriesValueSchema) {
                instance.ChildNodesAssociativeCollectionEntriesValueSchema = SchemaFromJSON(
                    data.ChildNodesAssociativeCollectionEntriesValueSchema
                );
            }
            if (data.ChildNodesLinearCollectionElementsSchema) {
                instance.ChildNodesLinearCollectionElementsSchema = SchemaFromJSON(data.ChildNodesLinearCollectionElementsSchema);
            }
            if (data.AssociativeCollectionEntryKeySchema) {
                instance.AssociativeCollectionEntryKeySchema = SchemaFromJSON(data.AssociativeCollectionEntryKeySchema);
            }
        }
        return instance;
    }

    public toJSON() {
        return {
            Kind: this.Kind,
            TypeOf: this.TypeOf,
            DefaultValue: this.DefaultValue,
            Nullable: this.Nullable,
            ChildNodes: this.ChildNodes,
            ChildNodesAssociativeCollectionEntriesKeySchema: this.ChildNodesAssociativeCollectionEntriesKeySchema,
            ChildNodesAssociativeCollectionEntriesValueSchema: this.ChildNodesAssociativeCollectionEntriesValueSchema,
            ChildNodesLinearCollectionElementsSchema: this.ChildNodesLinearCollectionElementsSchema,
            AssociativeCollectionEntryKeySchema: this.AssociativeCollectionEntryKeySchema,
            ChildNodesMustBeValid: this.ChildNodesMustBeValid
        };
    }
}

/**
 * DynamicSchema represents a collection of potential schemas.
 * Often used for the root of a schema document or polymorphic types.
 */
export class DynamicSchema implements Schema {
    /**
     * The key for the default {@link DynamicSchemaNode} in {@link Nodes}.
     * */
    private _DefaultSchemaNodeKey: string = 'default';
    public get DefaultSchemaNodeKey(): string {
        return this._DefaultSchemaNodeKey;
    }
    public set DefaultSchemaNodeKey(value: string) {
        this._DefaultSchemaNodeKey = value;
    }
    /**
     * A map of {@link DynamicSchemaNode}, each representing a single valid schema.
     * */
    private _Nodes: { [key: string]: DynamicSchemaNode } = {};
    public get Nodes(): { [key: string]: DynamicSchemaNode } {
        return this._Nodes;
    }
    public set Nodes(value: { [key: string]: DynamicSchemaNode }) {
        this._Nodes = value;
    }
    /**
     * A list of valid {@link DynamicSchemaNode} keys in {@link Nodes}. Usually populated through the schema validation process.
     * */
    private _ValidSchemaNodeKeys: string[] = [];
    public get ValidSchemaNodeKeys(): string[] {
        return this._ValidSchemaNodeKeys;
    }
    public set ValidSchemaNodeKeys(value: string[]) {
        this._ValidSchemaNodeKeys = value;
    }

    constructor(init?: Partial<DynamicSchema>) {
        if (init) {
            Object.assign(this, init);
        }
    }

    public IsSchema(): boolean {
        return true;
    }

    public static fromJSON(json: string | object): DynamicSchema {
        let data: any = json;
        if (typeof json === 'string') {
            data = JSON.parse(json);
        }

        const instance = new DynamicSchema();
        if (data) {
            if (data.DefaultSchemaNodeKey) instance.DefaultSchemaNodeKey = data.DefaultSchemaNodeKey;
            if (Array.isArray(data.ValidSchemaNodeKeys)) instance.ValidSchemaNodeKeys = data.ValidSchemaNodeKeys;
            if (data.Nodes) {
                instance.Nodes = {};
                for (const key in data.Nodes) {
                    instance.Nodes[key] = DynamicSchemaNode.fromJSON(data.Nodes[key]);
                }
            }
        }
        return instance;
    }

    public toJSON() {
        return {
            DefaultSchemaNodeKey: this.DefaultSchemaNodeKey,
            Nodes: this.Nodes,
            ValidSchemaNodeKeys: this.ValidSchemaNodeKeys
        };
    }
}

export const SchemaErrorCodes = {
    /**
     * Default error.
     */
    SchemaProcessorError: 'schema processing encountered an error',
    /**
     * Base error for {@link GetSchemaAtPath}.
     */
    SchemaPathError: 'schema path error',
    /**
     * Base error for {@link Validator} or {@link DefaultValidator}.
     */
    DataValidationAgainstSchemaFailed: 'data validation against schema failed',
    /**
     * Base error for {@link Deserializer}
     */
    DataDeserializationFailed: 'data deserialization failed',
    /**
     * Base error for {@link Converter} or {@link DefaultConverter}
     */
    DataConversionFailed: 'data conversion failed'
} as const;
export type SchemaErrorCode = (typeof SchemaErrorCodes)[keyof typeof SchemaErrorCodes];

/**
 * Helper to deserialize Schema from JSON.
 */
export function SchemaFromJSON(json: string | object): Schema {
    let data: any = json;
    if (typeof json === 'string') {
        data = JSON.parse(json);
    }
    // Heuristic: DynamicSchema has 'Nodes', DynamicSchemaNode does not (it has ChildNodes).
    if (data && typeof data === 'object' && 'Nodes' in data) {
        return DynamicSchema.fromJSON(data);
    }
    return DynamicSchemaNode.fromJSON(data);
}
