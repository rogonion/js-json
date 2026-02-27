import { IsMap, IsObject, IsSet, JsonError } from '@core';
import { CollectionMemberSegment, type RecursiveDescentSegment } from '@path';
import {
    DataKind,
    type DefaultValidator,
    DynamicSchema,
    DynamicSchemaNode,
    GetDataKind,
    type Schema,
    SchemaErrorCodes,
    type Validators
} from './core';

export class Validation implements DefaultValidator {
    private _ValidateOnFirstMatch: boolean = true;
    public set ValidateOnFirstMatch(value: boolean) {
        this._ValidateOnFirstMatch = value;
    }

    private _CustomValidators: Validators = {};
    public set CustomValidators(value: Validators) {
        this._CustomValidators = value;
    }

    public ValidateData(data: any, schema: Schema): boolean {
        return this.validateData(data, schema, [
            Object.assign(new CollectionMemberSegment(), { Key: '$', IsKeyRoot: true })
        ]);
    }

    public ValidateNode(data: any, schema: DynamicSchemaNode): boolean {
        return this.validateDataWithDynamicSchemaNode(data, schema, []);
    }

    private validateData(data: any, schema: Schema, pathSegments: RecursiveDescentSegment): boolean {
        if (schema instanceof DynamicSchema) {
            return this.validateDataWithDynamicSchema(data, schema, pathSegments);
        } else if (schema instanceof DynamicSchemaNode) {
            return this.validateDataWithDynamicSchemaNode(data, schema, pathSegments);
        }
        throw Object.assign(
            new JsonError('unsupported schema type', undefined, SchemaErrorCodes.SchemaProcessorError),
            {
                Data: { Schema: schema, Data: data, PathSegments: pathSegments }
            }
        );
    }

    private validateDataWithDynamicSchema(
        data: any,
        schema: DynamicSchema,
        pathSegments: RecursiveDescentSegment
    ): boolean {
        if (schema.DefaultSchemaNodeKey && schema.Nodes[schema.DefaultSchemaNodeKey]) {
            try {
                if (
                    this.validateDataWithDynamicSchemaNode(
                        data,
                        schema.Nodes[schema.DefaultSchemaNodeKey],
                        pathSegments
                    )
                ) {
                    schema.ValidSchemaNodeKeys.push(schema.DefaultSchemaNodeKey);
                    return true;
                }
            } catch (e) {
                // ignore
            }
        }

        if (Object.keys(schema.Nodes).length === 0) {
            throw Object.assign(
                new JsonError('no schema nodes found', undefined, SchemaErrorCodes.DataValidationAgainstSchemaFailed),
                {
                    Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                }
            );
        }

        let lastError: Error | undefined;
        for (const [key, node] of Object.entries(schema.Nodes)) {
            if (key === schema.DefaultSchemaNodeKey) continue;

            try {
                if (this.validateDataWithDynamicSchemaNode(data, node, pathSegments)) {
                    schema.ValidSchemaNodeKeys.push(key);
                    if (this._ValidateOnFirstMatch) {
                        return true;
                    }
                }
            } catch (e: any) {
                lastError = e;
            }
        }

        if (schema.ValidSchemaNodeKeys.length === 0) {
            throw (
                lastError ||
                Object.assign(
                    new JsonError(
                        'data not valid against any schema node',
                        undefined,
                        SchemaErrorCodes.DataValidationAgainstSchemaFailed
                    ),
                    {
                        Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                    }
                )
            );
        }
        return true;
    }

    private validateDataWithDynamicSchemaNode(
        data: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): boolean {
        if (data === null || data === undefined) {
            if (!schema.Nullable) {
                throw Object.assign(
                    new JsonError('data cannot be nil', undefined, SchemaErrorCodes.DataValidationAgainstSchemaFailed),
                    {
                        Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                    }
                );
            }
            return true;
        }

        if (schema.Kind === DataKind.Any) {
            return true;
        }

        const dataKind = GetDataKind(data);
        if (schema.Kind && schema.Kind !== dataKind) {
            throw Object.assign(
                new JsonError(
                    `data.Kind (${dataKind}) is not valid (expected ${schema.Kind})`,
                    undefined,
                    SchemaErrorCodes.DataValidationAgainstSchemaFailed
                ),
                {
                    Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                }
            );
        }

        if (schema.Validator) {
            return schema.Validator.ValidateData(data, schema, pathSegments);
        }

        if (data.constructor && this._CustomValidators[data.constructor.name]) {
            return this._CustomValidators[data.constructor.name].ValidateData(data, schema, pathSegments);
        }

        switch (dataKind) {
            case DataKind.Array:
                return this.validateDataWithDynamicSchemaNodeArray(data, schema, pathSegments);
            case DataKind.Set:
                return this.validateDataWithDynamicSchemaNodeSet(data, schema, pathSegments);
            case DataKind.Map:
                return this.validateDataWithDynamicSchemaNodeMap(data, schema, pathSegments);
            case DataKind.Object:
                return this.validateDataWithDynamicSchemaNodePOJO(data, schema, pathSegments);
            default:
                return true;
        }
    }

    // array/slice
    private validateDataWithDynamicSchemaNodeArray(
        data: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): boolean {
        const iterator = IsSet(data) ? (data as Set<any>).values() : data;

        if (schema.ChildNodesLinearCollectionElementsSchema) {
            let i = 0;
            for (const item of iterator) {
                const currentPathSegments = [
                    ...pathSegments,
                    Object.assign(new CollectionMemberSegment(), { Index: i, IsIndex: true })
                ];

                let currentSchema = schema.ChildNodesLinearCollectionElementsSchema;
                if (schema.ChildNodes && schema.ChildNodes[String(i)]) {
                    currentSchema = schema.ChildNodes[String(i)];
                }

                this.validateData(item, currentSchema, currentPathSegments);
                i++;
            }
            return true;
        }

        throw Object.assign(
            new JsonError(
                'schema to validate element(s) in data (slice/array) not found',
                undefined,
                SchemaErrorCodes.DataValidationAgainstSchemaFailed
            ),
            {
                Data: { Schema: schema, Data: data, PathSegments: pathSegments }
            }
        );
    }

    private validateDataWithDynamicSchemaNodeSet(
        data: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): boolean {
        const iterator = (data as Set<any>).values();

        if (schema.ChildNodesLinearCollectionElementsSchema) {
            let i = 0;
            for (const item of iterator) {
                const currentPathSegments = [
                    ...pathSegments,
                    Object.assign(new CollectionMemberSegment(), { Index: i, IsIndex: true })
                ];

                let currentSchema = schema.ChildNodesLinearCollectionElementsSchema;
                if (schema.ChildNodes && schema.ChildNodes[String(i)]) {
                    currentSchema = schema.ChildNodes[String(i)];
                }

                this.validateData(item, currentSchema, currentPathSegments);
                i++;
            }
            return true;
        }

        throw Object.assign(
            new JsonError(
                'schema to validate element(s) in data (set) not found',
                undefined,
                SchemaErrorCodes.DataValidationAgainstSchemaFailed
            ),
            {
                Data: { Schema: schema, Data: data, PathSegments: pathSegments }
            }
        );
    }

    private validateDataWithDynamicSchemaNodeMap(
        data: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): boolean {
        let entries: [any, any][] = [];
        if (IsMap(data)) {
            entries = Array.from((data as Map<any, any>).entries());
        } else if (IsObject(data)) {
            entries = Object.entries(data);
        }

        const hasGeneralSchema =
            schema.ChildNodesAssociativeCollectionEntriesKeySchema &&
            schema.ChildNodesAssociativeCollectionEntriesValueSchema;
        const hasSpecificSchema = schema.ChildNodes && Object.keys(schema.ChildNodes).length > 0;

        if (hasGeneralSchema || hasSpecificSchema) {
            const childSchemaNodesValidated: string[] = [];

            for (const [key, value] of entries) {
                const keyStr = String(key);
                const currentPathSegments = [
                    ...pathSegments,
                    Object.assign(new CollectionMemberSegment(), { Key: keyStr, IsKey: true })
                ];

                if (schema.ChildNodes && schema.ChildNodes[keyStr]) {
                    const childSchema = schema.ChildNodes[keyStr];

                    if (childSchema instanceof DynamicSchema) {
                        let matched = false;
                        let lastErr;
                        for (const [nodeKey, node] of Object.entries(childSchema.Nodes)) {
                            let keySchema = node.AssociativeCollectionEntryKeySchema;
                            if (!keySchema) keySchema = schema.ChildNodesAssociativeCollectionEntriesKeySchema;

                            let keyValid = false;
                            try {
                                if (keySchema) this.validateData(key, keySchema, currentPathSegments);
                                keyValid = true;
                            } catch {}

                            if (keyValid) {
                                try {
                                    this.validateData(value, node, currentPathSegments);
                                    childSchema.ValidSchemaNodeKeys.push(nodeKey);
                                    matched = true;
                                    break;
                                } catch (e) {
                                    lastErr = e;
                                }
                            }
                        }
                        if (!matched) {
                            throw (
                                lastErr ||
                                Object.assign(
                                    new JsonError(
                                        'map entry not valid against any DynamicSchema nodes',
                                        undefined,
                                        SchemaErrorCodes.DataValidationAgainstSchemaFailed
                                    ),
                                    {
                                        Data: { Schema: childSchema, Data: value, PathSegments: currentPathSegments }
                                    }
                                )
                            );
                        }
                    } else if (childSchema instanceof DynamicSchemaNode) {
                        let keySchema = childSchema.AssociativeCollectionEntryKeySchema;
                        if (!keySchema) keySchema = schema.ChildNodesAssociativeCollectionEntriesKeySchema;

                        if (keySchema) {
                            this.validateData(key, keySchema, currentPathSegments);
                        }
                        this.validateData(value, childSchema, currentPathSegments);
                    }

                    childSchemaNodesValidated.push(keyStr);
                    continue;
                }

                if (hasGeneralSchema) {
                    this.validateData(
                        key,
                        schema.ChildNodesAssociativeCollectionEntriesKeySchema!,
                        currentPathSegments
                    );
                    this.validateData(
                        value,
                        schema.ChildNodesAssociativeCollectionEntriesValueSchema!,
                        currentPathSegments
                    );
                    continue;
                }

                throw Object.assign(
                    new JsonError(
                        `Schema for map key ${keyStr} not found`,
                        undefined,
                        SchemaErrorCodes.DataValidationAgainstSchemaFailed
                    ),
                    {
                        Data: { Schema: schema, Data: data, PathSegments: currentPathSegments }
                    }
                );
            }

            if (schema.ChildNodesMustBeValid && schema.ChildNodes) {
                if (childSchemaNodesValidated.length !== Object.keys(schema.ChildNodes).length) {
                    throw Object.assign(
                        new JsonError(
                            'not all child nodes are present and validated against',
                            undefined,
                            SchemaErrorCodes.DataValidationAgainstSchemaFailed
                        ),
                        {
                            Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                        }
                    );
                }
            }

            return true;
        }

        throw Object.assign(
            new JsonError(
                'no schema to validate entries in data (map) found',
                undefined,
                SchemaErrorCodes.DataValidationAgainstSchemaFailed
            ),
            {
                Data: { Schema: schema, Data: data, PathSegments: pathSegments }
            }
        );
    }

    // struct
    private validateDataWithDynamicSchemaNodePOJO(
        data: any,
        schema: DynamicSchemaNode,
        pathSegments: RecursiveDescentSegment
    ): boolean {
        if (!schema.ChildNodes || Object.keys(schema.ChildNodes).length === 0) {
            throw Object.assign(
                new JsonError(
                    'no schema for properties in data struct found',
                    undefined,
                    SchemaErrorCodes.DataValidationAgainstSchemaFailed
                ),
                {
                    Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                }
            );
        }

        const childSchemaNodesValidated: string[] = [];

        for (const key of Object.keys(data)) {
            if (schema.ChildNodes[key]) {
                childSchemaNodesValidated.push(key);
                const currentPathSegments = [
                    ...pathSegments,
                    Object.assign(new CollectionMemberSegment(), { Key: key, IsKey: true })
                ];
                this.validateData(data[key], schema.ChildNodes[key], currentPathSegments);
            }
        }

        if (schema.ChildNodesMustBeValid) {
            if (childSchemaNodesValidated.length !== Object.keys(schema.ChildNodes).length) {
                throw Object.assign(
                    new JsonError(
                        'not all child nodes are present and validated against',
                        undefined,
                        SchemaErrorCodes.DataValidationAgainstSchemaFailed
                    ),
                    {
                        Data: { Schema: schema, Data: data, PathSegments: pathSegments }
                    }
                );
            }
        }

        return true;
    }
}
