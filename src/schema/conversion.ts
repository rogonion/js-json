import {
    type Converter,
    type Converters,
    DataKinds,
    DynamicSchema,
    DynamicSchemaNode,
    type Schema,
    SchemaError,
    SchemaErrorCodes
} from './core.ts'
import {CollectionMemberSegment, JsonpathKeyRoot, type RecursiveDescentSegment} from '@path'
import {
    IsArray,
    IsFunction,
    IsMap,
    IsMapAndNotEmpty,
    IsNullOrUndefined,
    IsObjectLiteral,
    IsObjectLiteralAndNotEmpty,
    IsSet,
    JSONstringify
} from '@core'

/**
 * Module for converting data against {@link Schema}
 *
 * @class
 * */
export class Conversion implements Converter {
    private _customConverters: Converters

    constructor(customConverters: Converters = new Map<string, Converter>()) {
        this._customConverters = customConverters
    }

    /**
     * @function
     * @throws SchemaError
     * */
    public Convert(source: any, schema: Schema, pathSegments: RecursiveDescentSegment = [CollectionMemberSegment.create().WithKey(JsonpathKeyRoot).WithIsKeyRoot(true).build()]): any {
        const FunctionName = 'Convert'

        if (schema instanceof DynamicSchema) {
            return this.convertToDynamicSchema(source, schema, pathSegments)
        } else if (schema instanceof DynamicSchemaNode) {
            return this.convertToDynamicSchemaNode(source, schema, pathSegments)
        } else {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'unsupported schema type', schema, source, pathSegments)
        }
    }

    private convertToDynamicSchema(source: any, schema: DynamicSchema, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'convertToDynamicSchema'

        if (!IsArray(schema.ValidSchemaNodeKeys)) {
            schema.ValidSchemaNodeKeys = []
        }

        if (schema.DefaultSchemaNodeKey) {
            if (schema.Nodes?.has(schema.DefaultSchemaNodeKey)) {
                try {
                    const result = this.convertToDynamicSchemaNode(source, schema.Nodes!.get(schema.DefaultSchemaNodeKey)!, pathSegments)
                    schema.ValidSchemaNodeKeys!.push(schema.DefaultSchemaNodeKey)
                    return result
                } catch (e) {
                }
            }
        }

        if (!IsMap(schema.Nodes)) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'no schema nodes found', schema, source, pathSegments)
        }

        let lastSchemaNodeError: SchemaError | undefined
        for (const [schemaNodeKey, dynamicSchemaNode] of schema.Nodes!) {
            if (schemaNodeKey === schema.DefaultSchemaNodeKey) {
                continue
            }

            try {
                const result = this.convertToDynamicSchemaNode(source, dynamicSchemaNode, pathSegments)
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

    private convertToDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'convertToDynamicSchemaNode'

        if (IsNullOrUndefined(source)) {
            if (schema.NullableOrUndefined) {
                return source
            }

            if (schema.IsDefaultValueSet) {
                return structuredClone(schema.DefaultValue)
            }
        }

        if (schema.Kind === DataKinds.Any) {
            return source
        }

        if (schema.Converter) {
            return schema.Converter.Convert(source, schema, pathSegments)
        }

        if (!IsNullOrUndefined(source)) {
            const typeName = source.constructor.name
            if (this._customConverters.has(typeName)) {
                return this._customConverters.get(typeName)!.Convert(source, schema, pathSegments)
            }
        }

        switch (schema.Kind) {
            case DataKinds.Number:
                return this.convertToNumberWithDynamicSchemaNode(source, schema, pathSegments)
            case DataKinds.Boolean:
                return this.convertToBoolWithDynamicSchemaNode(source, schema, pathSegments)
            case DataKinds.String:
                return this.convertToStringWithDynamicSchemaNode(source, schema, pathSegments)
            case DataKinds.Map:
                return this.convertToMapWithDynamicSchemaNode(source, schema, pathSegments)
            case DataKinds.Array:
                return this.convertToArrayWithDynamicSchemaNode(source, schema, pathSegments)
            case DataKinds.Set:
                return this.convertToSetWithDynamicSchemaNode(source, schema, pathSegments)
            case DataKinds.Object:
                return this.convertToObjectWithDynamicSchemaNode(source, schema, pathSegments)
            default:
                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'unsupported schema.Kind', schema, source, pathSegments)
        }
    }

    private convertToNumberWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): number {
        const FunctionName = 'convertToNumberWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.Number) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.Number}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'number':
                return source
            case 'string':
                const num = Number(source)
                if (Number.isNaN(num)) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted string to number is not a number`, schema, source, pathSegments)
                }
                return num
            default:
                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'unsupported source.Kind for number conversion', schema, source, pathSegments)
        }
    }

    private convertToBoolWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'convertToBoolWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.Boolean) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.Boolean}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'boolean':
                return source
            case 'number':
                return Boolean(source)
            default:
                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'unsupported source.Kind for bool conversion', schema, source, pathSegments)
        }
    }

    private convertToStringWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): string {
        const FunctionName = 'convertToStringWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.String) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.String}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'string':
                return source
            case 'number':
            case 'boolean':
                return source.toString()
            default:
                try {
                    return JSONstringify(source)
                } catch (e) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'convert source to json string failed', schema, source, pathSegments, {cause: e})
                }
        }
    }

    private convertToObjectWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): any {
        const FunctionName = 'convertToObjectWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.Object) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.Object}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'string':
                try {
                    const deserializedData = JSON.parse(source)
                    return this.convertToMapWithDynamicSchemaNode(deserializedData, schema, pathSegments)
                } catch (e) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'convert source string from json to object failed', schema, source, pathSegments, {cause: e})
                }
            case 'object':
                if (IsObjectLiteral(source)) {
                    let newObject: any
                    {
                        const defaultValue = IsFunction(schema.DefaultValue) ? schema.DefaultValue!() : {}
                        if (IsObjectLiteral(defaultValue)) {
                            newObject = defaultValue
                        } else {
                            newObject = {}
                        }
                    }

                    for (const [key, field] of Object.entries(source)) {
                        const currentPathSegments = [...pathSegments, {Key: key, IsKey: true}]

                        if (schema.ChildNodes?.has(key)) {
                            const childSchema = schema.ChildNodes!.get(key)!

                            if (childSchema instanceof DynamicSchema) {
                                if (!IsArray(childSchema.ValidSchemaNodeKeys)) {
                                    childSchema.ValidSchemaNodeKeys = []
                                }
                                if (IsMapAndNotEmpty(childSchema.Nodes)) {
                                    for (const [childNodeKey, childNode] of childSchema.Nodes!) {
                                        if (!IsObjectLiteral(childNode.AssociativeCollectionEntryKeySchema)) {
                                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'childNode.AssociativeCollectionEntryKeySchema is not valid', schema, source, pathSegments)
                                        }

                                        try {
                                            const convertedKey = this.Convert(key, childNode.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                            const convertedValue = this.convertToDynamicSchemaNode(field, childNode, currentPathSegments)
                                            if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                                newObject[convertedKey] = convertedValue
                                                childSchema.ValidSchemaNodeKeys!.push(childNodeKey)
                                                break
                                            }
                                        } catch (e) {
                                        }
                                    }
                                    if (childSchema.ValidSchemaNodeKeys!.length == 0) {
                                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `failed to convert ${DataKinds.Object} entry with key ${key} against any DynamicSchema nodes`, schema, source, pathSegments)
                                    }
                                    continue
                                } else {
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `no DynamicSchema nodes found for ${DataKinds.Object} key ${key}`, schema, source, pathSegments)
                                }
                            } else if (childSchema instanceof DynamicSchemaNode) {
                                try {
                                    let convertedKey: any
                                    if (IsObjectLiteral(childSchema.AssociativeCollectionEntryKeySchema)) {
                                        convertedKey = this.Convert(key, childSchema.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                    } else {
                                        convertedKey = key
                                    }
                                    const convertedValue = this.convertToDynamicSchemaNode(field, childSchema, currentPathSegments)
                                    if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                        newObject[convertedKey] = convertedValue
                                        continue
                                    }
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Object} key ${key} not valid`, schema, source, pathSegments)
                                } catch (e) {
                                    if (!childSchema.NullableOrUndefined) {
                                        throw e
                                    }
                                    continue
                                }
                            } else {
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Nodes in Schema for ${DataKinds.Object} key ${key} empty`, schema, source, pathSegments)
                            }
                        }

                        if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                            try {
                                const convertedKey = this.Convert(key, schema.ChildNodesAssociativeCollectionEntriesKeySchema!, currentPathSegments)
                                const convertedValue = this.Convert(field, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)
                                if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                    newObject[convertedKey] = convertedValue
                                    continue
                                }
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Object} key ${key} not valid`, schema, source, pathSegments)
                            } catch (e) {
                                if (!schema.NullableOrUndefined) {
                                    throw e
                                }
                                continue
                            }
                        }

                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Schema for ${DataKinds.Object} key ${key} not found`, schema, source, pathSegments)
                    }

                    return newObject
                }


                if (IsMap(source)) {
                    let newObject: any
                    {
                        const defaultValue = IsFunction(schema.DefaultValue) ? schema.DefaultValue!() : {}
                        if (IsObjectLiteral(defaultValue)) {
                            newObject = defaultValue
                        } else {
                            newObject = {}
                        }
                    }

                    for (const [key, field] of source) {
                        const currentPathSegments = [...pathSegments, {Key: key, IsKey: true}]

                        if (schema.ChildNodes?.has(key)) {
                            const childSchema = schema.ChildNodes!.get(key)!

                            if (childSchema instanceof DynamicSchema) {
                                if (!IsArray(childSchema.ValidSchemaNodeKeys)) {
                                    childSchema.ValidSchemaNodeKeys = []
                                }
                                if (IsMapAndNotEmpty(childSchema.Nodes)) {
                                    for (const [childNodeKey, childNode] of childSchema.Nodes!) {
                                        try {
                                            let convertedKey: any
                                            if (IsObjectLiteral(childNode.AssociativeCollectionEntryKeySchema)) {
                                                convertedKey = this.Convert(key, childNode.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                            } else {
                                                convertedKey = key
                                            }
                                            const convertedValue = this.convertToDynamicSchemaNode(field, childNode, currentPathSegments)
                                            if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                                newObject[convertedKey] = convertedValue
                                                childSchema.ValidSchemaNodeKeys!.push(childNodeKey)
                                                break
                                            }
                                        } catch (e) {
                                        }
                                    }
                                    if (childSchema.ValidSchemaNodeKeys!.length == 0) {
                                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `failed to convert ${DataKinds.Object} entry with key ${key} against any DynamicSchema nodes`, schema, source, pathSegments)
                                    }
                                    continue
                                } else {
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `no DynamicSchema nodes found for ${DataKinds.Object} key ${key}`, schema, source, pathSegments)
                                }
                            } else if (childSchema instanceof DynamicSchemaNode) {
                                try {
                                    let convertedKey: any
                                    if (IsObjectLiteral(childSchema.AssociativeCollectionEntryKeySchema)) {
                                        convertedKey = this.Convert(key, childSchema.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                    } else {
                                        convertedKey = key
                                    }
                                    const convertedValue = this.convertToDynamicSchemaNode(field, childSchema, currentPathSegments)
                                    if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                        newObject[convertedKey] = convertedValue
                                        continue
                                    }
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Object} key ${key} not valid`, schema, source, pathSegments)
                                } catch (e) {
                                    if (!childSchema.NullableOrUndefined) {
                                        throw e
                                    }
                                    continue
                                }
                            } else {
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Nodes in Schema for ${DataKinds.Object} key ${key} empty`, schema, source, pathSegments)
                            }
                        }

                        if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                            try {
                                const convertedKey = this.Convert(key, schema.ChildNodesAssociativeCollectionEntriesKeySchema!, currentPathSegments)
                                const convertedValue = this.Convert(field, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)
                                if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                    newObject[convertedKey] = convertedValue
                                    continue
                                }
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Object} key ${key} not valid`, schema, source, pathSegments)
                            } catch (e) {
                                if (!schema.NullableOrUndefined) {
                                    throw e
                                }
                                continue
                            }
                        }

                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Schema for ${DataKinds.Object} key ${key} not found`, schema, source, pathSegments)
                    }

                    return newObject
                }

                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'unsupported object type', schema, source, pathSegments)
        }
    }

    private convertToMapWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): Map<any, any> {
        const FunctionName = 'convertToMapWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.Map) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.Map}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'string':
                try {
                    const deserializedData = JSON.parse(source)
                    return this.convertToMapWithDynamicSchemaNode(deserializedData, schema, pathSegments)
                } catch (e) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'convert source string from json to object failed', schema, source, pathSegments, {cause: e})
                }
            case 'object':
                if (IsObjectLiteral(source)) {
                    let newMap: Map<any, any>
                    {
                        const defaultValue = IsFunction(schema.DefaultValue) ? schema.DefaultValue!() : new Map<any, any>()
                        if (IsMap(defaultValue)) {
                            newMap = defaultValue
                        } else {
                            newMap = new Map<any, any>()
                        }
                    }

                    for (const [key, field] of Object.entries(source)) {
                        const currentPathSegments = [...pathSegments, {Key: key, IsKey: true}]

                        if (schema.ChildNodes?.has(key)) {
                            const childSchema = schema.ChildNodes!.get(key)!

                            if (childSchema instanceof DynamicSchema) {
                                if (!IsArray(childSchema.ValidSchemaNodeKeys)) {
                                    childSchema.ValidSchemaNodeKeys = []
                                }
                                if (IsMapAndNotEmpty(childSchema.Nodes)) {
                                    for (const [childNodeKey, childNode] of childSchema.Nodes!) {
                                        if (!IsObjectLiteral(childNode.AssociativeCollectionEntryKeySchema)) {
                                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'childNode.AssociativeCollectionEntryKeySchema is not valid', schema, source, pathSegments)
                                        }

                                        try {
                                            const convertedKey = this.Convert(key, childNode.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                            const convertedValue = this.convertToDynamicSchemaNode(field, childNode, currentPathSegments)
                                            if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                                newMap.set(convertedKey, convertedValue)
                                                childSchema.ValidSchemaNodeKeys!.push(childNodeKey)
                                                break
                                            }
                                        } catch (e) {
                                        }
                                    }
                                    if (childSchema.ValidSchemaNodeKeys!.length == 0) {
                                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `failed to convert ${DataKinds.Map} entry with key ${key} against any DynamicSchema nodes`, schema, source, pathSegments)
                                    }
                                    continue
                                } else {
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `no DynamicSchema nodes found for ${DataKinds.Map} key ${key}`, schema, source, pathSegments)
                                }
                            } else if (childSchema instanceof DynamicSchemaNode) {
                                if (!IsObjectLiteral(childSchema.AssociativeCollectionEntryKeySchema)) {
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'childSchema.AssociativeCollectionEntryKeySchema is not valid', schema, source, pathSegments)
                                }

                                try {
                                    const convertedKey = this.Convert(key, childSchema.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                    const convertedValue = this.convertToDynamicSchemaNode(field, childSchema, currentPathSegments)
                                    if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                        newMap.set(convertedKey, convertedValue)
                                        continue
                                    }
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Map} key ${key} not valid`, schema, source, pathSegments)
                                } catch (e) {
                                    if (!childSchema.NullableOrUndefined) {
                                        throw e
                                    }
                                    continue
                                }
                            } else {
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Nodes in Schema for ${DataKinds.Map} key ${key} empty`, schema, source, pathSegments)
                            }
                        }

                        if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                            try {
                                const convertedKey = this.Convert(key, schema.ChildNodesAssociativeCollectionEntriesKeySchema!, currentPathSegments)
                                const convertedValue = this.Convert(field, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)
                                if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                    newMap.set(convertedKey, convertedValue)
                                    continue
                                }
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Map} key ${key} not valid`, schema, source, pathSegments)
                            } catch (e) {
                                if (!schema.NullableOrUndefined) {
                                    throw e
                                }
                                continue
                            }
                        }

                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Schema for ${DataKinds.Map} key ${key} not found`, schema, source, pathSegments)
                    }

                    return newMap
                }

                if (IsMap(source)) {
                    let newMap: Map<any, any>
                    {
                        const defaultValue = IsFunction(schema.DefaultValue) ? schema.DefaultValue!() : new Map<any, any>()
                        if (IsMap(defaultValue)) {
                            newMap = defaultValue
                        } else {
                            newMap = new Map<any, any>()
                        }
                    }

                    for (const [key, field] of source) {
                        const currentPathSegments = [...pathSegments, {Key: key, IsKey: true}]

                        if (schema.ChildNodes?.has(key)) {
                            const childSchema = schema.ChildNodes!.get(key)!

                            if (childSchema instanceof DynamicSchema) {
                                if (!IsArray(childSchema.ValidSchemaNodeKeys)) {
                                    childSchema.ValidSchemaNodeKeys = []
                                }
                                if (IsMapAndNotEmpty(childSchema.Nodes)) {
                                    for (const [childNodeKey, childNode] of childSchema.Nodes!) {
                                        if (!IsObjectLiteral(childNode.AssociativeCollectionEntryKeySchema)) {
                                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'childNode.AssociativeCollectionEntryKeySchema is not valid', schema, source, pathSegments)
                                        }

                                        try {
                                            const convertedKey = this.Convert(key, childNode.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                            const convertedValue = this.convertToDynamicSchemaNode(field, childNode, currentPathSegments)
                                            if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                                newMap.set(convertedKey, convertedValue)
                                                childSchema.ValidSchemaNodeKeys!.push(childNodeKey)
                                                break
                                            }
                                        } catch (e) {
                                        }
                                    }
                                    if (childSchema.ValidSchemaNodeKeys!.length == 0) {
                                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `failed to convert ${DataKinds.Map} entry with key ${key} against any DynamicSchema nodes`, schema, source, pathSegments)
                                    }
                                    continue
                                } else {
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `no DynamicSchema nodes found for ${DataKinds.Map} key ${key}`, schema, source, pathSegments)
                                }
                            } else if (childSchema instanceof DynamicSchemaNode) {
                                if (!IsObjectLiteral(childSchema.AssociativeCollectionEntryKeySchema)) {
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'childSchema.AssociativeCollectionEntryKeySchema is not valid', schema, source, pathSegments)
                                }

                                try {
                                    const convertedKey = this.Convert(key, childSchema.AssociativeCollectionEntryKeySchema!, currentPathSegments)
                                    const convertedValue = this.convertToDynamicSchemaNode(field, childSchema, currentPathSegments)
                                    if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                        newMap.set(convertedKey, convertedValue)
                                        continue
                                    }
                                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Map} key ${key} not valid`, schema, source, pathSegments)
                                } catch (e) {
                                    if (!childSchema.NullableOrUndefined) {
                                        throw e
                                    }
                                    continue
                                }
                            } else {
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Nodes in Schema for ${DataKinds.Map} key ${key} empty`, schema, source, pathSegments)
                            }
                        }

                        if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                            try {
                                const convertedKey = this.Convert(key, schema.ChildNodesAssociativeCollectionEntriesKeySchema!, currentPathSegments)
                                const convertedValue = this.Convert(field, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)
                                if (!IsNullOrUndefined(convertedValue) && !IsNullOrUndefined(convertedKey)) {
                                    newMap.set(convertedKey, convertedValue)
                                    continue
                                }
                                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `converted ${DataKinds.Map} key ${key} not valid`, schema, source, pathSegments)
                            } catch (e) {
                                if (!schema.NullableOrUndefined) {
                                    throw e
                                }
                                continue
                            }
                        }

                        throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `Schema for ${DataKinds.Map} key ${key} not found`, schema, source, pathSegments)
                    }

                    return newMap
                }

                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'unsupported object type', schema, source, pathSegments)
            default:
                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `unsupported source.Kind for ${DataKinds.Map} conversion`, schema, source, pathSegments)
        }
    }

    private convertToSetWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): Set<any> {
        const FunctionName = 'convertToSetWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.Set) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.Set}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'string':
                try {
                    const deserializedData = JSON.parse(source)
                    return this.convertToSetWithDynamicSchemaNode(deserializedData, schema, pathSegments)
                } catch (e) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'convert source string from json to object failed', schema, source, pathSegments, {cause: e})
                }
            case 'object':
                if (!IsObjectLiteral(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema for ${DataKinds.Set} entries not found`, schema, source, pathSegments)
                }

                let newSet: Set<any>
            {
                const defaultValue = IsFunction(schema.DefaultValue) ? schema.DefaultValue!() : new Set<any>()
                if (IsSet(defaultValue)) {
                    newSet = defaultValue
                } else {
                    newSet = new Set<any>()
                }
            }

                if (IsArray(source)) {
                    for (let i = 0; i < source.length; i++) {
                        const currentPathSegments = [...pathSegments, {Index: i, IsIndex: true}]

                        const result = this.Convert(source[i], schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)
                        if (!IsNullOrUndefined(result)) {
                            newSet.add(result)
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `conversion of source ${DataKinds.Array} element at index ${i} to ${DataKinds.Set} entry returned null or undefined`, schema, source, pathSegments)
                        }
                    }
                    return newSet
                }

                if (IsSet(source)) {
                    let i = 0
                    for (const entry of source as Set<any>) {
                        const currentPathSegments = [...pathSegments, {Index: i, IsIndex: true}]

                        const result = this.Convert(entry, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)
                        if (!IsNullOrUndefined(result)) {
                            newSet.add(result)
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `conversion of source ${DataKinds.Set} entry at index ${i} to ${DataKinds.Set} entry returned null or undefined`, schema, source, pathSegments)
                        }
                        i++
                    }
                    return newSet
                }

                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `unsupported source object`, schema, source, pathSegments)
            default:
                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `unsupported source.Kind for ${DataKinds.Set} conversion`, schema, source, pathSegments)
        }
    }

    private convertToArrayWithDynamicSchemaNode(source: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): any[] {
        const FunctionName = 'convertToArrayWithDynamicSchemaNode'

        if (schema.Kind !== DataKinds.Array) {
            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema.Kind is not ${DataKinds.Array}`, schema, source, pathSegments)
        }

        switch (typeof source) {
            case 'string':
                try {
                    const deserializedData = JSON.parse(source)
                    return this.convertToArrayWithDynamicSchemaNode(deserializedData, schema, pathSegments)
                } catch (e) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, 'convert source string from json to object failed', schema, source, pathSegments, {cause: e})
                }
            case 'object':
                if (!IsObjectLiteral(schema.ChildNodesLinearCollectionElementsSchema)) {
                    throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `schema for ${DataKinds.Array} elements not found`, schema, source, pathSegments)
                }

                let newArray: any[]
            {
                const defaultValue = IsFunction(schema.DefaultValue) ? schema.DefaultValue!() : []
                if (IsArray(defaultValue)) {
                    newArray = defaultValue
                } else {
                    newArray = []
                }
            }

                if (IsArray(source)) {
                    for (let i = 0; i < source.length; i++) {
                        const currentPathSegments = [...pathSegments, {Index: i, IsIndex: true}]

                        const result = this.Convert(source[i], schema.ChildNodesLinearCollectionElementsSchema!, currentPathSegments)
                        if (!IsNullOrUndefined(result)) {
                            newArray.push(result)
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `conversion of source ${DataKinds.Array} element at index ${i} to ${DataKinds.Array} element returned null or undefined`, schema, source, pathSegments)
                        }
                    }
                    return newArray
                }

                if (IsSet(source)) {
                    let i = 0
                    for (const entry of source as Set<any>) {
                        const currentPathSegments = [...pathSegments, {Index: i, IsIndex: true}]

                        const result = this.Convert(entry, schema.ChildNodesLinearCollectionElementsSchema!, currentPathSegments)
                        if (!IsNullOrUndefined(result)) {
                            newArray.push(result)
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `conversion of source ${DataKinds.Set} entry at index ${i} to ${DataKinds.Array} element returned null or undefined`, schema, source, pathSegments)
                        }
                        i++
                    }
                    return newArray
                }

                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `unsupported source object`, schema, source, pathSegments)
            default:
                throw new SchemaError(SchemaErrorCodes.DataConversionFailed, FunctionName, `unsupported source.Kind for ${DataKinds.Array} conversion`, schema, source, pathSegments)
        }
    }
}

