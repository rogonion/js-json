import type {JSONPath, RecursiveDescentSegment, RecursiveDescentSegments} from '@path'
import {IsArray, IsMap, IsSet} from '@core'

/**
 * Represents a JSONPath in its parsed and unparsed form.
 *
 * Ideally functions are expected to only work with a JSONPath with no recursive descent searches.
 * */
export type SchemaPath = JSONPath | RecursiveDescentSegment | RecursiveDescentSegments

/**
 * for defining custom conversion logic.
 *
 * Meant to be implemented by custom data types that need to perform specific value-based conversion beyond defaults.
 * */
export interface Converter {
    /**
     * converts data based on schema.
     *
     * @function
     * @param source The data to be converted.
     * @param schema The schema encountered to convert against.
     * @param pathSegments Current Path segments where data was encountered. Useful if {@link SchemaError} is thrown.
     * @returns deserialized data.
     * @throws SchemaError with code {@link SchemaErrorCodes.DataConversionFailed} if conversion was not successful.
     * */
    Convert: (source: any, schema: Schema, pathSegments: RecursiveDescentSegment) => any;
}

/**
 * Map of custom converters with key representing unique `typeName`.
 *
 * Intended to be used for custom conversion logic of user-defined classes where `typeName` is obtained using `class.constructor.name`.
 * */
export type Converters = Map<string, Converter>

/**
 * for defining custom data validation logic.
 *
 * Meant to be implemented by custom data types that need to perform specific value-based validation that goes beyond the defaults.
 * */
export interface Validator {
    /**
     * validates data against a SchemaManip using custom rules.
     *
     * @function
     * @param data The data to be converted.
     * @param schema The schema encountered to be validated against with custom rules.
     * @param pathSegments Current Path segments where data was encountered. Useful if {@link SchemaError} is thrown.
     * @returns deserialized data.
     * @throws SchemaError with code {@link SchemaErrorCodes.DataValidationAgainstSchemaFailed} if schema validation was not successful.
     * */
    ValidateData: (data: any, schema: Schema, pathSegments: RecursiveDescentSegment) => boolean;
}

/**
 * Map of custom validators with key representing unique `typeName`.
 *
 * Intended to be used for custom validation logic of user-defined classes where `typeName` is obtained using `class.constructor.name`.
 * */
export type Validators = Map<string, Validator>

/**
 * For performing deserialization of data from various source formats to a destination that adheres to the {@link Schema}.
 * */
export interface Deserializer {
    /**
     * Deserializes JSON string into destination using {@link Schema}.
     *
     * @function
     * @throws SchemaError
     * */
    FromJSON: (source: string, schema: Schema, reviver?: (this: any, key: string, value: any) => any) => any;

    /**
     * Deserializes YAML string into destination using {@link Schema}.
     *
     * @function
     * @throws SchemaError
     * */
    FromYAML: (source: string, schema: Schema, options?: any) => any;
}

/**
 * Structure that represent a JSON-like schema.
 * */
export interface Schema {
    /**
     * placeholder implementor that returns `true` to indicate that they represent a JSON-Like schema.
     * **/
    IsSchema: () => boolean

    /**
     * Return string (like JSON) representation of schema.
     * */
    toJSON: () => {}
}

/**
 * Represents the set of {@link DynamicSchemaNodes} in {@link DynamicSchema.Nodes} that can be looped through for purposes such as {@link Validator validation} or {@link Converter conversion}.
 *
 * The key is unique ID which is appended to {@link DynamicSchema.ValidSchemaNodeKeys} when an action perform against a schema node is successful.
 * */
export type DynamicSchemaNodes = Map<string, DynamicSchemaNode>

export class DynamicSchema implements Schema {
    /**
     * The key for the default {@link DynamicSchemaNode} in {@link Nodes}.
     * */
    public DefaultSchemaNodeKey?: string

    /**
     * A map of {@link DynamicSchemaNode}, each representing a single valid schema.
     * */
    public Nodes?: DynamicSchemaNodes

    /**
     * A list of valid {@link DynamicSchemaNode} keys in {@link Nodes}. Usually populated through the schema validation process.
     * */
    public ValidSchemaNodeKeys?: string[]

    private constructor(builder: DynamicSchemaBuilder) {
        Object.assign(this, builder)
    }

    public IsSchema(): boolean {
        return true
    }

    public toJSON() {
        return {
            DefaultSchemaNodeKey: this.DefaultSchemaNodeKey,
            Nodes: this.Nodes
                ? Object.fromEntries(this.Nodes.entries())
                : undefined,
            ValidSchemaNodeKeys: this.ValidSchemaNodeKeys
        }
    }

    public static create(): DynamicSchemaBuilder {
        return new DynamicSchemaBuilder()
    }
}

export class DynamicSchemaBuilder {
    public build() {
        return new (DynamicSchema as any)(this) as DynamicSchema
    }

    public DefaultSchemaNodeKey?: string = DynamicSchemaDefaultNodeKey

    public withDefaultSchemaNodeKey(value?: string) {
        this.DefaultSchemaNodeKey = value
        return this
    }

    public Nodes?: DynamicSchemaNodes

    public withNodes(value?: DynamicSchemaNodes) {
        this.Nodes = value
        return this
    }

    public ValidSchemaNodeKeys?: string[]

    public withValidSchemaNodeKeys(value?: string[]) {
        this.ValidSchemaNodeKeys = value
        return this
    }
}

export const DynamicSchemaDefaultNodeKey = 'default'

/**
 * Distinct categories of types of data.
 * */
export const DataKinds = Object.freeze({
    String: 'String',
    Number: 'Number',
    Boolean: 'Boolean',
    Array: 'Array',
    Map: 'Map',
    Set: 'Set',
    Object: 'Object',
    Any: 'Any'
})
export type DataKind = typeof DataKinds[keyof typeof DataKinds]

export function DataKindFromTypeOf(v: any): DataKind {
    switch (typeof v) {
        case 'string':
            return DataKinds.String
        case 'number':
            return DataKinds.Number
        case 'boolean':
            return DataKinds.Boolean
        case 'object':
            if (IsMap(v)) {
                return DataKinds.Map
            }
            if (IsArray(v)) {
                return DataKinds.Array
            }
            if (IsSet(v)) {
                return DataKinds.Set
            }
            return DataKinds.Object
        default:
            return DataKinds.Any
    }
}

/**
 * defines a single specific schema node within a {@link DynamicSchema}.
 *
 *  Useful when recursively setting data in a nested data structure during the creation of new nesting structure by discovering the exact type to use at each {@link CollectionMemberSegment} in a Path.
 * */
export class DynamicSchemaNode implements Schema {
    /**
     * The type of data. typically obtained using `typeof`.
     * */
    public TypeOf?: string

    /**
     * The underlying type of the data.
     * */
    public Kind?: DataKind

    /**
     * An instance of the default value to use.
     *
     * Important for new values (like maps or user-defined classes) created recursively at each path segment.
     * */
    public DefaultValue?: () => any

    /**
     * Indicates if {@link DefaultValue} has been set since it can be nil.
     * */
    public IsDefaultValueSet?: boolean

    /**
     * Specifies whether the current value can be empty.
     * */
    public NullableOrUndefined?: boolean

    /**
     * Specify a {@link Validator} for this specific node.
     * */
    public Validator?: Validator

    /**
     * A recursive map defining the schema for the following:
     * * Specific key-value entries in an associative collection like map.
     *
     *      For each entry, it is important to specify the key type using {@link ChildNodesAssociativeCollectionEntriesKeySchema}.
     * * Specific elements at indexes in a linear collection like slice or array.
     * * All class top level members specifically those that are User defined.
     * */
    public ChildNodes?: ChildNodes

    /**
     * {@link Schema} for all keys of entries in an associative collection. Mandatory if Kind is {@link DataKind.Dictionary}.
     * */
    public ChildNodesAssociativeCollectionEntriesKeySchema?: Schema

    /**
     * {@link Schema} for all values of entries in an associative collection. Mandatory if Kind is {@link DataKind.Dictionary}.
     * */
    public ChildNodesAssociativeCollectionEntriesValueSchema?: Schema

    /**
     * {@link Schema} for all elements in an array. Mandatory if Kind is {@link DataKind.Array}.
     * */
    public ChildNodesLinearCollectionElementsSchema?: Schema

    /**
     * {@link Schema}  for node that is a specific entry in an associative collection.
     *
     * Ideally this means that the Kind in {@link ChildNodesAssociativeCollectionEntriesKeySchema} of the parent map is {@link DataKind.Any}.
     * */
    public AssociativeCollectionEntryKeySchema?: Schema

    /**
     * Ensure all {@linkcode ChildNodes} are present and validated.
     * */
    public ChildNodesMustBeValid?: boolean

    private constructor(builder: DynamicSchemaNodeBuilder) {
        Object.assign(this, builder)
    }

    /**
     * Specify {@link Converter} for this specific node.
     * */
    public Converter?: Converter

    public IsSchema(): boolean {
        return true
    }

    public toJSON() {
        return {
            Type: this.TypeOf,
            Kind: this.Kind,
            DefaultValue: this.DefaultValue,
            IsDefaultValueSet: this.IsDefaultValueSet,
            Nullable: this.NullableOrUndefined,
            ChildNodes: this.ChildNodes
                ? Object.fromEntries(this.ChildNodes.entries())
                : undefined,
            ChildNodesAssociativeCollectionEntriesValueSchema: this.ChildNodesAssociativeCollectionEntriesValueSchema,
            ChildNodesLinearCollectionElementsSchema: this.ChildNodesLinearCollectionElementsSchema,
            AssociativeCollectionEntryKeySchema: this.AssociativeCollectionEntryKeySchema,
            ChildNodesMustBeValid: this.ChildNodesMustBeValid
        }
    }

    public static create(): DynamicSchemaNodeBuilder {
        return new DynamicSchemaNodeBuilder()
    }
}

export type ChildNodes = Map<string, Schema>

export class DynamicSchemaNodeBuilder {
    public build() {
        return new (DynamicSchemaNode as any)(this) as DynamicSchemaNode
    }

    public TypeOf?: string

    public withTypeOf(value?: string): DynamicSchemaNodeBuilder {
        this.TypeOf = value
        return this
    }

    public Kind?: DataKind

    public withKind(value?: DataKind): DynamicSchemaNodeBuilder {
        this.Kind = value
        return this
    }

    public DefaultValue?: () => any

    public withDefaultValue(value?: () => any): DynamicSchemaNodeBuilder {
        this.DefaultValue = value
        return this
    }

    public IsDefaultValueSet?: boolean

    public withIsDefaultValueSet(value?: boolean): DynamicSchemaNodeBuilder {
        this.IsDefaultValueSet = value
        return this
    }

    public Nullable?: boolean

    public withNullable(value?: boolean): DynamicSchemaNodeBuilder {
        this.Nullable = value
        return this
    }

    public Validator?: Validator

    public withValidator(value?: Validator): DynamicSchemaNodeBuilder {
        this.Validator = value
        return this
    }

    public ChildNodes?: ChildNodes

    public withChildNodes(value?: ChildNodes): DynamicSchemaNodeBuilder {
        this.ChildNodes = value
        return this
    }

    public ChildNodesAssociativeCollectionEntriesKeySchema?: Schema

    public withChildNodesAssociativeCollectionEntriesKeySchema(value?: Schema): DynamicSchemaNodeBuilder {
        this.ChildNodesAssociativeCollectionEntriesKeySchema = value
        return this
    }

    public ChildNodesAssociativeCollectionEntriesValueSchema?: Schema

    public withChildNodesAssociativeCollectionEntriesValueSchema(value?: Schema): DynamicSchemaNodeBuilder {
        this.ChildNodesAssociativeCollectionEntriesValueSchema = value
        return this
    }

    public ChildNodesLinearCollectionElementsSchema?: Schema

    public withChildNodesLinearCollectionElementsSchema(value?: Schema): DynamicSchemaNodeBuilder {
        this.ChildNodesLinearCollectionElementsSchema = value
        return this
    }

    public AssociativeCollectionEntryKeySchema?: Schema

    public withAssociativeCollectionEntryKeySchema(value?: Schema): DynamicSchemaNodeBuilder {
        this.AssociativeCollectionEntryKeySchema = value
        return this
    }

    public ChildNodesMustBeValid?: boolean

    public withChildNodesMustBeValid(value?: boolean): DynamicSchemaNodeBuilder {
        this.ChildNodesMustBeValid = value
        return this
    }

    public Converter?: Converter

    public withConverter(value?: Converter): DynamicSchemaNodeBuilder {
        this.Converter = value
        return this
    }
}

export const SchemaErrorCodes = Object.freeze({
    /**
     * general {@link Schema} error.
     * */
    SchemaProcessorError: 'schema processing encountered an error',

    /**
     * For when {@link SchemaAtPath.Get} fails.
     * */
    SchemaPathError: 'schema path error',

    /**
     * for when {@link Validator} fails.
     * */
    DataValidationAgainstSchemaFailed: 'data validation against schema failed',

    /**
     * for when {@link Deserializer} fails.
     * */
    DataDeserializationFailed: 'data deserialization failed',

    /**
     * for when {@link Converter} fails.
     * */
    DataConversionFailed: 'data conversion failed'
})
export type SchemaErrorCode = typeof SchemaErrorCodes[keyof typeof SchemaErrorCodes]

/**
 * For when modules/classes that work with {@link Schema} need to return an error.
 * */
export class SchemaError extends Error {
    public readonly name: string = 'SchemaError'

    public readonly errorCode?: SchemaErrorCode
    public readonly functionName?: string
    public readonly schema?: Schema
    public readonly data: any
    public readonly pathSegments?: RecursiveDescentSegment

    constructor(errorCode?: SchemaErrorCode, functionName?: string, message?: string, schema?: Schema, data?: any, pathSegments?: RecursiveDescentSegment, options?: ErrorOptions) {
        super(message, options)
        this.errorCode = errorCode
        this.functionName = functionName
        this.schema = schema
        this.data = data
        this.pathSegments = pathSegments

        // Set the prototype explicitly. This is crucial for maintaining the
        // correct inheritance chain in older JavaScript environments,
        // though modern Node.js and browsers handle this automatically.
        // It's a good practice for reliability.
        Object.setPrototypeOf(this, SchemaError.prototype)
    }
}