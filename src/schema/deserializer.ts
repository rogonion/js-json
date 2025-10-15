import {
    type Converter,
    type Converters,
    DataKinds,
    type Deserializer,
    DynamicSchema,
    DynamicSchemaNode,
    type Schema,
    SchemaError,
    SchemaErrorCodes
} from './core.ts'
import {JsonpathKeyRoot, type RecursiveDescentSegment} from '@path'
import {IsArray, IsMap, IsNullOrUndefined} from '@core'
import {Conversion} from './conversion.ts'
import YAML from 'yaml'

export class Deserialization implements Deserializer {
    private _customConverters: Converters
    private _defaultConverter: Converter

    constructor(defaultConverter: Converter = new Conversion(), customConverters: Converters = new Map<string, Converter>()) {
        this._defaultConverter = defaultConverter
        this._customConverters = customConverters
    }

    public FromJSON(source: string, schema: Schema, reviver?: (this: any, key: string, value: any) => any): any {
        const FunctionName = 'FromJSON'

        let deserializedData: any
        try {
            deserializedData = JSON.parse(source, reviver)
        } catch (e) {
            throw new SchemaError(SchemaErrorCodes.DataDeserializationFailed, FunctionName, 'parse json source failed', schema, source, undefined, {cause: e})
        }

        return this.deserialize(deserializedData, schema, [{Key: JsonpathKeyRoot, IsKeyRoot: true}])
    }

    public FromYAML(source: string, schema: Schema, options?: any): any {
        const FunctionName = 'FromYAML'

        let deserializedData: any
        try {
            deserializedData = YAML.parse(source, options)
        } catch (e) {
            throw new SchemaError(SchemaErrorCodes.DataDeserializationFailed, FunctionName, 'parse yaml source failed', schema, source, undefined, {cause: e})
        }

        return this.deserialize(deserializedData, schema, [{Key: JsonpathKeyRoot, IsKeyRoot: true}])
    }

    private deserialize(source: any, schema: Schema, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'deserialize'

        if (schema instanceof DynamicSchema) {
            return this.deserializeWithDynamicSchema(source, schema, pathSegments)
        } else if (schema instanceof DynamicSchemaNode) {
            return this.deserializeWithDynamicSchemaNode(source, schema, pathSegments)
        } else {
            throw new SchemaError(SchemaErrorCodes.DataDeserializationFailed, FunctionName, 'unsupported schema type', schema, source, pathSegments)
        }
    }

    private deserializeWithDynamicSchema(source: any, schema: DynamicSchema, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'deserializeWithDynamicSchema'

        if (!IsArray(schema.ValidSchemaNodeKeys)) {
            schema.ValidSchemaNodeKeys = []
        }

        if (schema.DefaultSchemaNodeKey) {
            if (schema.Nodes?.has(schema.DefaultSchemaNodeKey)) {
                try {
                    const result = this.deserializeWithDynamicSchemaNode(source, schema.Nodes!.get(schema.DefaultSchemaNodeKey)!, pathSegments)
                    schema.ValidSchemaNodeKeys!.push(schema.DefaultSchemaNodeKey)
                    return result
                } catch (e) {
                }
            }
        }

        if (!IsMap(schema.Nodes)) {
            throw new SchemaError(SchemaErrorCodes.DataDeserializationFailed, FunctionName, 'no schema nodes found', schema, source, pathSegments)
        }

        let lastSchemaNodeError: SchemaError | undefined
        for (const [schemaNodeKey, dynamicSchemaNode] of schema.Nodes!) {
            if (schemaNodeKey === schema.DefaultSchemaNodeKey) {
                continue
            }

            try {
                const result = this.deserializeWithDynamicSchemaNode(source, dynamicSchemaNode, pathSegments)
                schema.ValidSchemaNodeKeys!.push(schemaNodeKey)
                return result
            } catch (e) {
                lastSchemaNodeError = e as SchemaError
            }
        }

        if (lastSchemaNodeError) {
            throw lastSchemaNodeError
        }
        return undefined
    }

    private deserializeWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'deserializeWithDynamicSchemaNode'

        if (IsNullOrUndefined(source)) {
            if (schema.NullableOrUndefined) {
                return source
            }

            if (schema.IsDefaultValueSet) {
                return schema.DefaultValue
            }

            throw new SchemaError(SchemaErrorCodes.DataDeserializationFailed, FunctionName, 'source cannot be null or undefined', schema, source, pathSegments)
        }

        if (schema.Kind === DataKinds.Any) {
            return source
        }

        {
            const typeName = source.constructor.name
            if (this._customConverters.has(typeName)) {
                try {
                    return this._customConverters.get(typeName)!.Convert(source, schema, pathSegments)
                } catch (e) {
                    throw new SchemaError(SchemaErrorCodes.DataDeserializationFailed, FunctionName, 'convert deserialized source using custom converter failed', schema, source, pathSegments, {cause: e})
                }
            }
        }

        return this._defaultConverter.Convert(source, schema, pathSegments)
    }
}