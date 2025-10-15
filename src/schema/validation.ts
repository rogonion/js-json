import {
    DataKinds,
    DynamicSchema,
    DynamicSchemaNode,
    type Schema,
    SchemaError,
    SchemaErrorCodes,
    type Validator,
    type Validators
} from './core.ts'
import {CollectionMemberSegment, JsonpathKeyRoot, type RecursiveDescentSegment} from '@path'
import {
    IsArray,
    IsMap,
    IsMapAndNotEmpty,
    IsNullOrUndefined,
    IsObjectLiteral,
    IsObjectLiteralAndNotEmpty,
    IsSet
} from '@core'

/**
 * Module for validating data against {@link Schema}.
 *
 * @class
 * */
export class Validation implements Validator {
    private readonly validateOnFirstMatch: boolean

    private _customValidators: Validators

    constructor(validateOnFirstMatch: boolean = true, validators: Validators = new Map<string, Validator>()) {
        this.validateOnFirstMatch = validateOnFirstMatch
        this._customValidators = validators
    }

    /**
     * @function
     * @throws SchemaError
     * */
    public ValidateData(data: any, schema: Schema, pathSegments: RecursiveDescentSegment = [CollectionMemberSegment.create().WithKey(JsonpathKeyRoot).WithIsKeyRoot(true).build()]): boolean {
        const FunctionName = 'ValidateData'

        if (schema instanceof DynamicSchema) {
            return this.validateDataWithDynamicSchema(data, schema, pathSegments)
        } else if (schema instanceof DynamicSchemaNode) {
            return this.validateDataWithDynamicSchemaNode(data, schema, pathSegments)
        } else {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'unsupported schema type', schema, data, pathSegments)
        }
    }

    /**
     * @function
     * @throws SchemaError
     * */
    public validateDataWithDynamicSchema(data: any, schema: DynamicSchema, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'validateDataWithDynamicSchema'

        if (!IsArray(schema.ValidSchemaNodeKeys)) {
            schema.ValidSchemaNodeKeys = []
        }

        if (schema.DefaultSchemaNodeKey) {
            if (schema.Nodes?.has(schema.DefaultSchemaNodeKey)) {
                try {
                    if (this.validateDataWithDynamicSchemaNode(data, schema.Nodes!.get(schema.DefaultSchemaNodeKey)!, pathSegments)) {
                        schema.ValidSchemaNodeKeys!.push(schema.DefaultSchemaNodeKey)
                        return true
                    }
                } catch (e) {
                }
            }
        }

        if (!IsMap(schema.Nodes)) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'no schema nodes found', schema, data, pathSegments)
        }


        let lastSchemaNodeError: SchemaError | undefined
        for (const [schemaNodeKey, dynamicSchemaNode] of schema.Nodes!) {
            if (schemaNodeKey === schema.DefaultSchemaNodeKey) {
                continue
            }

            try {
                const dataValidAgainstSchema = this.validateDataWithDynamicSchemaNode(data, dynamicSchemaNode, pathSegments)
                if (dataValidAgainstSchema) {
                    schema.ValidSchemaNodeKeys!.push(schemaNodeKey)
                    if (this.validateOnFirstMatch) {
                        return true
                    }
                }
            } catch (e) {
                lastSchemaNodeError = e as SchemaError
            }
        }

        if (schema.ValidSchemaNodeKeys!.length === 0) {
            if (lastSchemaNodeError) {
                throw lastSchemaNodeError
            }
            return false
        }

        return true
    }

    /**
     * @function
     * @throws SchemaError
     * */
    private validateDataWithDynamicSchemaNode(data: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'validateDataWithDynamicSchemaNode'

        if (IsNullOrUndefined(data)) {
            if (!schema.NullableOrUndefined) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'data cannot be null or undefined', schema, data, pathSegments)
            }
            return true
        }

        if (schema.Kind === DataKinds.Any) {
            return true
        }

        if (typeof data !== schema.TypeOf) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'typeof data not valid', schema, data, pathSegments)
        }

        if (schema.Validator) {
            return schema.Validator.ValidateData(data, schema, pathSegments)
        }

        if (!IsNullOrUndefined(data)) {
            const typeName = data.constructor.name
            if (this._customValidators.has(typeName)) {
                return this._customValidators.get(typeName)!.ValidateData(data, schema, pathSegments)
            }
        }

        switch (typeof data) {
            case 'object':
                switch (schema.Kind) {
                    case DataKinds.Array:
                        return this.validateDataWithDynamicSchemaNodeArray(data, schema, pathSegments)
                    case DataKinds.Map:
                        return this.validateDataWithDynamicSchemaNodeMap(data, schema, pathSegments)
                    case DataKinds.Set:
                        return this.validateDataWithDynamicSchemaNodeSet(data, schema, pathSegments)
                    default:
                        return this.validateDataWithDynamicSchemaNodeObject(data, schema, pathSegments)
                }
            default:
                return true
        }
    }

    private validateDataWithDynamicSchemaNodeMap(data: Map<any, any>, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'validateDataWithDynamicSchemaNodeMap'
        if (IsNullOrUndefined(data)) {
            if (!schema.NullableOrUndefined) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'data cannot be null or undefined', schema, data, pathSegments)
            }
            return true
        }

        if (!IsMap(data)) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `data is not a ${DataKinds.Map}`, schema, data, pathSegments)
        }

        if (IsMapAndNotEmpty(schema.ChildNodes) || (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema))) {
            let childSchemaNodesValidated: string[] = []

            for (const [key, childObjectValue] of data) {
                let currentPathSegments = [...pathSegments, {Key: key, IsKey: true}]

                if (schema.ChildNodes?.has(key)) {
                    let childSchema = schema.ChildNodes!.get(key)!

                    if (childSchema instanceof DynamicSchema) {
                        if (!IsArray(childSchema.ValidSchemaNodeKeys)) {
                            childSchema.ValidSchemaNodeKeys = []
                        }
                        if (IsMapAndNotEmpty(childSchema.Nodes)) {
                            for (const [childNodeKey, childNode] of childSchema.Nodes!) {
                                if (!childNode.AssociativeCollectionEntryKeySchema) {
                                    throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Schema for all ${DataKinds.Map} keys for key ${key}`, schema, data, pathSegments)
                                }
                                if (this.ValidateData(key, childNode.AssociativeCollectionEntryKeySchema, currentPathSegments)) {
                                    if (this.ValidateData(childObjectValue, childNode, currentPathSegments)) {
                                        childSchema.ValidSchemaNodeKeys!.push(childNodeKey)
                                    }
                                }
                            }
                            if (childSchema.ValidSchemaNodeKeys!.length === 0) {
                                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `${DataKinds.Map} entry with key ${key} not valid against any DynamicSchema nodes`, schema, data, pathSegments)
                            }
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `No DynamicSchema found for ${DataKinds.Map} key ${key}`, schema, data, pathSegments)
                        }
                    } else if (childSchema instanceof DynamicSchemaNode) {
                        if (!childSchema.AssociativeCollectionEntryKeySchema) {
                            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Schema for all ${DataKinds.Map} keys for key ${key}`, schema, data, pathSegments)
                        }

                        if (this.ValidateData(key, childSchema.AssociativeCollectionEntryKeySchema, currentPathSegments)) {
                            if (!this.ValidateData(childObjectValue, childSchema, currentPathSegments)) {
                                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Value for ${DataKinds.Map} key ${key} not valid against schema`, schema, data, pathSegments)
                            }
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Key for ${DataKinds.Map} key ${key} not valid against schema`, schema, data, pathSegments)
                        }
                    } else {
                        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Unsupported schema type for ${DataKinds.Map} key ${key}`, schema, data, pathSegments)
                    }

                    childSchemaNodesValidated.push(key)
                    continue
                }

                if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                    if (this.ValidateData(key, schema.ChildNodesAssociativeCollectionEntriesKeySchema!, currentPathSegments)) {
                        if (this.ValidateData(childObjectValue, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)) {
                            continue
                        }
                        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Value for ${DataKinds.Map} key ${key} not valid against schema`, schema, data, pathSegments)
                    }
                    throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Key for ${DataKinds.Map} key ${key} not valid against schema`, schema, data, pathSegments)
                }

                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `no schema to validate entries in data (${DataKinds.Map}) found`, schema, data, pathSegments)
            }

            if (schema.ChildNodes && childSchemaNodesValidated.length !== schema.ChildNodes.size && schema.ChildNodesMustBeValid) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'not all child nodes are present and validated against', schema, data, pathSegments)
            }

            return true
        }

        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `no schema to validate entries in data (${DataKinds.Map}) found`, schema, data, pathSegments)
    }

    private validateDataWithDynamicSchemaNodeObject(data: any, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'validateDataWithDynamicSchemaNodeObject'

        if (IsNullOrUndefined(data)) {
            if (!schema.NullableOrUndefined) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'data cannot be null or undefined', schema, data, pathSegments)
            }
            return true
        }

        if (!IsObjectLiteral(data)) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `data is not an ${DataKinds.Object}`, schema, data, pathSegments)
        }

        if (IsMapAndNotEmpty(schema.ChildNodes) || (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema))) {
            let childSchemaNodesValidated: string[] = []

            for (const [key, childObjectValue] of Object.entries(data)) {
                let currentPathSegments = [...pathSegments, {Key: key, IsKey: true}]

                if (schema.ChildNodes?.has(key)) {
                    let childSchema = schema.ChildNodes!.get(key)!

                    if (childSchema instanceof DynamicSchema) {
                        childSchema.ValidSchemaNodeKeys = []
                        if (IsMapAndNotEmpty(childSchema.Nodes)) {
                            for (const [childNodeKey, childNode] of childSchema.Nodes!) {
                                if (this.ValidateData(childObjectValue, childNode, currentPathSegments)) {
                                    childSchema.ValidSchemaNodeKeys.push(childNodeKey)
                                }
                            }
                            if (childSchema.ValidSchemaNodeKeys.length === 0) {
                                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `${DataKinds.Object} entry with key ${key} not valid against any DynamicSchema nodes`, schema, data, pathSegments)
                            }
                        } else {
                            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `No DynamicSchema found for ${DataKinds.Object} key ${key}`, schema, data, pathSegments)
                        }
                    } else if (childSchema instanceof DynamicSchemaNode) {
                        if (!this.ValidateData(childObjectValue, childSchema, currentPathSegments)) {
                            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Value for ${DataKinds.Object} key ${key} not valid against schema`, schema, data, pathSegments)
                        }
                    } else {
                        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Unsupported schema type for ${DataKinds.Object} key ${key}`, schema, data, pathSegments)
                    }

                    childSchemaNodesValidated.push(key)
                    continue
                }

                if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesKeySchema) && IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
                    if (this.ValidateData(key, schema.ChildNodesAssociativeCollectionEntriesKeySchema!, currentPathSegments)) {
                        if (this.ValidateData(childObjectValue, schema.ChildNodesAssociativeCollectionEntriesValueSchema!, currentPathSegments)) {
                            continue
                        }
                        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Value for ${DataKinds.Object} key ${key} not valid against schema`, schema, data, pathSegments)
                    }
                    throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `Key for ${DataKinds.Object} key ${key} not valid against schema`, schema, data, pathSegments)
                }

                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `no schema to validate entries in data (${DataKinds.Object}) found`, schema, data, pathSegments)
            }

            if (schema.ChildNodes && childSchemaNodesValidated.length !== schema.ChildNodes.size && schema.ChildNodesMustBeValid) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'not all child nodes are present and validated against', schema, data, pathSegments)
            }

            return true
        }

        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `no schema to validate entries in data (${DataKinds.Object}) found`, schema, data, pathSegments)
    }

    private validateDataWithDynamicSchemaNodeSet(data: Set<any>, schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'validateDataWithDynamicSchemaNodeSet'

        if (IsNullOrUndefined(data)) {
            if (!schema.NullableOrUndefined) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'data cannot be null or undefined', schema, data, pathSegments)
            }
            return true
        }

        if (!IsSet(data)) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `data is not a ${DataKinds.Set}`, schema, data, pathSegments)
        }

        if (IsObjectLiteralAndNotEmpty(schema.ChildNodesAssociativeCollectionEntriesValueSchema)) {
            let childSchema = schema.ChildNodesAssociativeCollectionEntriesValueSchema!

            let i = 0
            for (const entry of data) {
                let currentPathSegments = [...pathSegments, {Index: i, IsIndex: true}]

                if (!this.ValidateData(entry, childSchema!, currentPathSegments)) {
                    return false
                }

                i++
            }

            return true
        }

        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `schema to validate entries in data (${DataKinds.Set}) not found`, schema, data, pathSegments)
    }

    private validateDataWithDynamicSchemaNodeArray(data: any[], schema: DynamicSchemaNode, pathSegments: RecursiveDescentSegment): boolean {
        const FunctionName = 'validateDataWithDynamicSchemaNodeArray'

        if (IsNullOrUndefined(data)) {
            if (!schema.NullableOrUndefined) {
                throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, 'data cannot be null or undefined', schema, data, pathSegments)
            }
            return true
        }

        if (!IsArray(data)) {
            throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `data is not an ${DataKinds.Array}`, schema, data, pathSegments)
        }

        if (IsObjectLiteralAndNotEmpty(schema.ChildNodesLinearCollectionElementsSchema)) {
            const childSchema = schema.ChildNodesLinearCollectionElementsSchema!

            for (let i = 0; i < data.length; i++) {
                let currentPathSegments = [...pathSegments, {Index: i, IsIndex: true}]

                if (!this.ValidateData(data[i], childSchema, currentPathSegments)) {
                    return false
                }
            }

            return true
        }

        throw new SchemaError(SchemaErrorCodes.DataValidationAgainstSchemaFailed, FunctionName, `schema to validate element(s) in data (${DataKinds.Array}) not found`, schema, data, pathSegments)
    }
}