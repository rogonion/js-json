import { IsArray, IsDefined, IsMap, IsObject, IsSet, JsonError } from '@core';
import {
    type Converters,
    DataKind,
    type DefaultConverter,
    DynamicSchema,
    DynamicSchemaNode,
    GetDataKind,
    type Schema,
    SchemaErrorCodes
} from './core';
import { CollectionMemberSegment, type RecursiveDescentSegment } from '@path';

export class Conversion implements DefaultConverter {
    private _CustomConverters: Converters = {};
    public set CustomConverters(value: Converters) {
        this._CustomConverters = value;
    }

    public RecursiveConvert(source: any, schema: Schema, pathSegments: RecursiveDescentSegment): any {
        if (schema instanceof DynamicSchema) {
            return this.convertToDynamicSchema(source, schema, pathSegments);
        } else if (schema instanceof DynamicSchemaNode) {
            return this.convertToDynamicSchemaNode(source, schema, pathSegments);
        }
        throw Object.assign(
            new JsonError('unsupported schema type', undefined, SchemaErrorCodes.SchemaProcessorError),
            {
                Data: { Schema: schema, Source: source, PathSegments: pathSegments }
            }
        );
    }

    public Convert(source: any, schema: Schema): any {
        return this.RecursiveConvert(source, schema, [
            Object.assign(new CollectionMemberSegment(), { Key: '$', IsKeyRoot: true })
        ]);
    }

    public ConvertNode(source: any, schema: DynamicSchemaNode): any {
        return this.convertToDynamicSchemaNode(source, schema, []);
    }

    private convertToDynamicSchema(source: any, schema: DynamicSchema, pathSegments: RecursiveDescentSegment): any {
        // Try default node first
        if (schema.DefaultSchemaNodeKey && schema.Nodes[schema.DefaultSchemaNodeKey]) {
            try {
                const result = this.convertToDynamicSchemaNode(
                    source,
                    schema.Nodes[schema.DefaultSchemaNodeKey],
                    pathSegments
                );
                schema.ValidSchemaNodeKeys.push(schema.DefaultSchemaNodeKey);
                return result;
            } catch (e) {
                // Ignore and try others
            }
        }

        if (Object.keys(schema.Nodes).length === 0) {
            throw Object.assign(
                new JsonError('no schema nodes found', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        let lastError: Error | undefined;
        for (const [key, node] of Object.entries(schema.Nodes)) {
            if (key === schema.DefaultSchemaNodeKey) continue;

            try {
                const result = this.convertToDynamicSchemaNode(source, node, pathSegments);
                schema.ValidSchemaNodeKeys.push(key);
                return result;
            } catch (e: any) {
                lastError = e;
            }
        }

        throw (
            lastError ||
            Object.assign(
                new JsonError(
                    'failed to convert against any schema node',
                    undefined,
                    SchemaErrorCodes.DataConversionFailed
                ),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            )
        );
    }

    private convertToDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        // Handle null/undefined
        if (!IsDefined(source)) {
            if (schema.DefaultValue) return schema.DefaultValue();
            if (schema.Nullable) return null;
            return undefined;
        }

        // Converter check
        if (schema.Converter) {
            return schema.Converter.Convert(source, schema, pathSegments);
        }

        // Custom converters check
        if (source.constructor && this._CustomConverters[source.constructor.name]) {
            return this._CustomConverters[source.constructor.name].Convert(source, schema, pathSegments);
        }

        // If source is already of the correct type (and not Any), return it
        const sourceKind = GetDataKind(source);
        if (
            schema.Kind === DataKind.Any ||
            (schema.Kind &&
                schema.Kind === sourceKind &&
                sourceKind !== DataKind.Object &&
                sourceKind !== DataKind.Array &&
                sourceKind !== DataKind.Map &&
                sourceKind !== DataKind.Set)
        ) {
            return source;
        }

        switch (schema.Kind) {
            case DataKind.Number:
                return this.convertToNumberWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.BigInt:
                return this.convertToBigintWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.String:
                return this.convertToStringWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Boolean:
                return this.convertToBooleanWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Symbol:
                return this.convertToSymbolWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Function:
                return this.convertToFunctionWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Object:
                return this.convertToPOJOWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Map:
                return this.convertToMapWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Array:
                return this.convertToArrayWithDynamicSchemaNode(source, schema, pathSegments);
            case DataKind.Set:
                return this.convertToSetWithDynamicSchemaNode(source, schema, pathSegments);
            default:
                throw Object.assign(
                    new JsonError('unsupported schema.Kind', undefined, SchemaErrorCodes.DataConversionFailed),
                    {
                        Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                    }
                );
        }
    }

    // array/slice
    private convertToArrayWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Array) {
            throw Object.assign(
                new JsonError('schema.Kind is not Array', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'string') {
            let deserializedData: any;
            try {
                deserializedData = JSON.parse(source);
            } catch (e) {
                throw Object.assign(
                    new JsonError(
                        'failed to parse string as JSON array',
                        undefined,
                        SchemaErrorCodes.DataConversionFailed
                    ),
                    {
                        Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                    }
                );
            }
            return this.convertToArrayWithDynamicSchemaNode(deserializedData, schema, pathSegments);
        }

        if (!IsArray(source) && !IsSet(source)) {
            throw Object.assign(
                new JsonError('source is not an array or set', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        const newArray: any[] = schema.DefaultValue ? schema.DefaultValue() : [];
        const iterator = IsSet(source) ? (source as Set<any>).values() : source;

        let i = 0;
        for (const item of iterator) {
            const currentPathSegments = [...pathSegments, Object.assign(new CollectionMemberSegment(), { Index: i })];

            let currentSchema = schema.ChildNodesLinearCollectionElementsSchema;
            if (schema.ChildNodes && schema.ChildNodes[String(i)]) {
                currentSchema = schema.ChildNodes[String(i)];
            }

            if (!currentSchema) {
                throw Object.assign(
                    new JsonError('no schema for array element', undefined, SchemaErrorCodes.DataConversionFailed),
                    {
                        Data: { Schema: schema, Source: item, PathSegments: currentPathSegments }
                    }
                );
            }

            const convertedItem = this.RecursiveConvert(item, currentSchema, currentPathSegments);
            newArray.push(convertedItem);
            i++;
        }

        return newArray;
    }

    private convertToMapWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Map) {
            throw Object.assign(
                new JsonError('schema.Kind is not Map', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'string') {
            let deserializedData: any;
            try {
                deserializedData = JSON.parse(source);
            } catch (e) {
                throw Object.assign(
                    new JsonError(
                        'failed to parse string as JSON map',
                        undefined,
                        SchemaErrorCodes.DataConversionFailed
                    ),
                    {
                        Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                    }
                );
            }
            return this.convertToMapWithDynamicSchemaNode(deserializedData, schema, pathSegments);
        }

        const newMap = schema.DefaultValue ? schema.DefaultValue() : new Map<any, any>();

        let entries: [any, any][] = [];
        if (IsMap(source)) {
            entries = Array.from((source as Map<any, any>).entries());
        } else if (IsObject(source)) {
            entries = Object.entries(source);
        } else {
            throw Object.assign(
                new JsonError('source is not a map or object', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        for (const [key, value] of entries) {
            let convertedKey = key;
            if (schema.ChildNodesAssociativeCollectionEntriesKeySchema) {
                convertedKey = this.RecursiveConvert(
                    key,
                    schema.ChildNodesAssociativeCollectionEntriesKeySchema,
                    pathSegments
                );
            } else {
                convertedKey = String(key);
            }

            const currentPathSegments = [
                ...pathSegments,
                Object.assign(new CollectionMemberSegment(), { Key: String(convertedKey), IsKey: true })
            ];

            let valueSchema: Schema | undefined;
            if (schema.ChildNodes && schema.ChildNodes[String(convertedKey)]) {
                valueSchema = schema.ChildNodes[String(convertedKey)];
            } else if (schema.ChildNodesAssociativeCollectionEntriesValueSchema) {
                valueSchema = schema.ChildNodesAssociativeCollectionEntriesValueSchema;
            }

            if (!valueSchema) {
                throw Object.assign(
                    new JsonError(
                        `no schema found for map value at key ${convertedKey}`,
                        undefined,
                        SchemaErrorCodes.DataConversionFailed
                    ),
                    {
                        Data: { Schema: schema, Source: value, PathSegments: currentPathSegments }
                    }
                );
            }

            const convertedValue = this.RecursiveConvert(value, valueSchema, currentPathSegments);
            newMap.set(convertedKey, convertedValue);
        }

        return newMap;
    }

    private convertToSetWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Set) {
            throw Object.assign(
                new JsonError('schema.Kind is not Set', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        const arrayResult = this.convertToArrayWithDynamicSchemaNode(
            source,
            Object.assign(new DynamicSchemaNode(), schema, { Kind: DataKind.Array }),
            pathSegments
        );
        return new Set(arrayResult);
    }

    // struct
    private convertToPOJOWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Object) {
            throw Object.assign(
                new JsonError('schema.Kind is not Object', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'string') {
            let deserializedData: any;
            try {
                deserializedData = JSON.parse(source);
            } catch (e) {
                throw Object.assign(
                    new JsonError(
                        'failed to parse string as JSON object',
                        undefined,
                        SchemaErrorCodes.DataConversionFailed
                    ),
                    {
                        Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                    }
                );
            }
            return this.convertToPOJOWithDynamicSchemaNode(deserializedData, schema, pathSegments);
        }

        if (!IsObject(source) && !IsMap(source)) {
            throw Object.assign(
                new JsonError('source is not an object or map', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: {
                        Schema: schema,
                        Source: source,
                        PathSegments: pathSegments,
                        Message: 'source is not an object or map'
                    }
                }
            );
        }

        const target: any = schema.DefaultValue ? schema.DefaultValue() : {};

        // Strict check: Ensure all source keys exist in schema
        if (IsMap(source)) {
            for (const key of (source as Map<any, any>).keys()) {
                if (schema.ChildNodes && !Object.prototype.hasOwnProperty.call(schema.ChildNodes, String(key))) {
                    throw Object.assign(
                        new JsonError(
                            `field ${String(key)} not found in schema`,
                            undefined,
                            SchemaErrorCodes.DataConversionFailed
                        ),
                        {
                            Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                        }
                    );
                }
            }
        } else {
            for (const key of Object.keys(source)) {
                if (schema.ChildNodes && !Object.prototype.hasOwnProperty.call(schema.ChildNodes, key)) {
                    throw Object.assign(
                        new JsonError(
                            `field ${key} not found in schema`,
                            undefined,
                            SchemaErrorCodes.DataConversionFailed
                        ),
                        {
                            Data: {
                                Schema: schema,
                                Source: source,
                                PathSegments: pathSegments,
                                Message: `field ${key} not found in schema`
                            }
                        }
                    );
                }
            }
        }

        if (schema.ChildNodes) {
            for (const key in schema.ChildNodes) {
                const childSchema = schema.ChildNodes[key];
                const currentPathSegments = [
                    ...pathSegments,
                    Object.assign(new CollectionMemberSegment(), { Key: key, IsKey: true })
                ];

                let sourceValue: any;
                let found = false;

                if (IsMap(source)) {
                    if ((source as Map<any, any>).has(key)) {
                        sourceValue = (source as Map<any, any>).get(key);
                        found = true;
                    }
                } else {
                    if (source && Object.prototype.hasOwnProperty.call(source, key)) {
                        sourceValue = (source as any)[key];
                        found = true;
                    }
                }

                if (found) {
                    const convertedValue = this.RecursiveConvert(sourceValue, childSchema, currentPathSegments);
                    target[key] = convertedValue;
                } else {
                    if (
                        childSchema instanceof DynamicSchemaNode &&
                        !childSchema.Nullable &&
                        !childSchema.DefaultValue
                    ) {
                        throw Object.assign(
                            new JsonError(
                                `missing required field ${key}`,
                                undefined,
                                SchemaErrorCodes.DataConversionFailed
                            ),
                            {
                                Data: { Schema: schema, Source: source, PathSegments: currentPathSegments }
                            }
                        );
                    }
                }
            }
        }

        return target;
    }

    private convertToNumberWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Number) {
            throw Object.assign(
                new JsonError('schema.Kind is not Number', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'number') return source;
        if (typeof source === 'boolean') return source ? 1 : 0;
        if (typeof source === 'string') {
            const n = Number(source);
            if (!isNaN(n)) return n;
        }

        throw Object.assign(
            new JsonError('failed to convert to number', undefined, SchemaErrorCodes.DataConversionFailed),
            {
                Data: { Schema: schema, Source: source, PathSegments: pathSegments }
            }
        );
    }

    private convertToStringWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.String) {
            throw Object.assign(
                new JsonError('schema.Kind is not String', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'string') return source;
        if (typeof source === 'symbol') return source.description || source.toString();
        if (typeof source === 'object') {
            try {
                return JSON.stringify(source);
            } catch {
                return String(source);
            }
        }
        return String(source);
    }

    private convertToBooleanWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Boolean) {
            throw Object.assign(
                new JsonError('schema.Kind is not Boolean', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'boolean') return source;
        if (typeof source === 'number') return source !== 0;
        if (typeof source === 'string') {
            const lower = source.toLowerCase();
            if (lower === 'true') return true;
            if (lower === 'false') return false;
            const n = Number(source);
            if (!isNaN(n)) return n !== 0;
        }

        throw Object.assign(
            new JsonError('failed to convert to boolean', undefined, SchemaErrorCodes.DataConversionFailed),
            {
                Data: { Schema: schema, Source: source, PathSegments: pathSegments }
            }
        );
    }

    private convertToBigintWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        try {
            return BigInt(source);
        } catch (e) {
            throw Object.assign(
                new JsonError('failed to convert to BigInt', e as Error, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }
    }

    private convertToSymbolWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Symbol) {
            throw Object.assign(
                new JsonError('schema.Kind is not Symbol', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'symbol') return source;
        if (typeof source === 'string') return Symbol.for(source);

        throw Object.assign(
            new JsonError('failed to convert to Symbol', undefined, SchemaErrorCodes.DataConversionFailed),
            {
                Data: { Schema: schema, Source: source, PathSegments: pathSegments }
            }
        );
    }

    private convertToFunctionWithDynamicSchemaNode(
        source: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): any {
        if (schema.Kind !== DataKind.Function) {
            throw Object.assign(
                new JsonError('schema.Kind is not Function', undefined, SchemaErrorCodes.DataConversionFailed),
                {
                    Data: { Schema: schema, Source: source, PathSegments: pathSegments }
                }
            );
        }

        if (typeof source === 'function') return source;

        throw Object.assign(
            new JsonError('failed to convert to Function', undefined, SchemaErrorCodes.DataConversionFailed),
            {
                Data: { Schema: schema, Source: source, PathSegments: pathSegments }
            }
        );
    }
}
