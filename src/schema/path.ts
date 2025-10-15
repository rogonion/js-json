import {CollectionMemberSegment, Parse, type RecursiveDescentSegment, type RecursiveDescentSegments} from '@path'
import {
    DataKinds,
    DynamicSchema,
    DynamicSchemaNode,
    type Schema,
    SchemaError,
    SchemaErrorCodes,
    type SchemaPath
} from './core.ts'
import {PathSegmentsIndexes} from '@internal'
import {IsArray, IsArrayAndNotEmpty, IsMap, IsMapAndNotEmpty} from '@core'


export class SchemaAtPath {
    private _recursiveDescentSegment!: RecursiveDescentSegment

    public Get<T extends SchemaPath>(path: T, schema: Schema): DynamicSchemaNode | undefined {
        const FunctionName = 'Get'

        if (typeof path === 'string') {
            const parsedJsonPath = Parse(path)
            if (parsedJsonPath.length == 1) {
                this._recursiveDescentSegment = parsedJsonPath[0]
            } else {
                throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'Parsed JSON path contains multiple recursive descent segments', schema)
            }
        } else if (IsArrayAndNotEmpty(path)) {
            if (path.length > 1) {
                if (path[0] instanceof CollectionMemberSegment) {
                    this._recursiveDescentSegment = path as RecursiveDescentSegment
                } else {
                    throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'Parsed JSON path contains multiple recursive descent segments', schema)
                }
            } else {
                if (path[0] instanceof CollectionMemberSegment) {
                    this._recursiveDescentSegment = path as RecursiveDescentSegment
                } else if (!IsArray(path[0])) {
                    const pathRecursiveDescentSegments = path as RecursiveDescentSegments
                    if (pathRecursiveDescentSegments.length == 1) {
                        this._recursiveDescentSegment = pathRecursiveDescentSegments[0]
                    } else {
                        throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'Parsed JSON path contains multiple recursive descent segments', schema)
                    }
                } else {
                    throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'unsupported path type', schema)
                }
            }
        } else {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'unsupported path type', schema)
        }

        return this.recursiveGetSchemaAtPath(PathSegmentsIndexes.create().WithCurrentCollection(0).WithLastCollection(this._recursiveDescentSegment.length - 1).build(), schema)
    }

    private recursiveGetSchemaAtPath(currentPathSegmentIndexes: PathSegmentsIndexes, currentSchema: Schema): DynamicSchemaNode | undefined {
        const FunctionName = 'recursiveGetSchemaAtPath'

        if (currentSchema instanceof DynamicSchema) {
            return this.recursiveGetDynamicSchemaAtPath(currentPathSegmentIndexes, currentSchema)
        } else if (currentSchema instanceof DynamicSchemaNode) {
            return this.recursiveGetDynamicSchemaNodeAtPath(currentPathSegmentIndexes, currentSchema)
        } else {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'unsupported schema type', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
        }
    }

    private recursiveGetDynamicSchemaAtPath(currentPathSegmentIndexes: PathSegmentsIndexes, currentSchema: DynamicSchema): DynamicSchemaNode | undefined {
        const FunctionName = 'recursiveGetDynamicSchemaAtPath'

        if (!IsArray(currentSchema.ValidSchemaNodeKeys)) {
            currentSchema.ValidSchemaNodeKeys = []
        }

        if (currentSchema.DefaultSchemaNodeKey) {
            if (currentSchema.Nodes?.has(currentSchema.DefaultSchemaNodeKey)) {
                try {
                    const result = this.recursiveGetDynamicSchemaNodeAtPath(currentPathSegmentIndexes, currentSchema.Nodes!.get(currentSchema.DefaultSchemaNodeKey)!)
                    currentSchema.ValidSchemaNodeKeys!.push(currentSchema.DefaultSchemaNodeKey)
                    return result
                } catch (e) {
                }
            }
        }

        if (!IsMap(currentSchema.Nodes)) {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'no schema nodes found', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
        }

        let lastSchemaNodeError: SchemaError | undefined
        for (const [schemaNodeKey, dynamicSchemaNode] of currentSchema.Nodes!) {
            if (schemaNodeKey === currentSchema.DefaultSchemaNodeKey) {
                continue
            }

            try {
                const result = this.recursiveGetDynamicSchemaNodeAtPath(currentPathSegmentIndexes, dynamicSchemaNode)
                currentSchema.ValidSchemaNodeKeys!.push(schemaNodeKey)
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

    private getDefaultDynamicSchemaNode(currentPathSegmentIndexes: PathSegmentsIndexes, currentSchema: DynamicSchema): DynamicSchemaNode | undefined {
        const FunctionName = 'getDefaultDynamicSchemaNode'

        if (!IsMapAndNotEmpty(currentSchema.Nodes)) {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'no schema nodes found', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
        }

        if (currentSchema.DefaultSchemaNodeKey) {
            if (currentSchema.Nodes?.has(currentSchema.DefaultSchemaNodeKey)) {
                return currentSchema.Nodes!.get(currentSchema.DefaultSchemaNodeKey)!
            }
        }

        return currentSchema.Nodes!.entries().next().value![1]
    }

    private recursiveGetDynamicSchemaNodeAtPath(currentPathSegmentIndexes: PathSegmentsIndexes, currentSchema: DynamicSchemaNode): DynamicSchemaNode | undefined {
        const FunctionName = 'recursiveGetDynamicSchemaNodeAtPath'

        if (currentPathSegmentIndexes.CurrentCollection! > currentPathSegmentIndexes.LastCollection!) {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'current path segment indexes exhausted', undefined, currentSchema, this._recursiveDescentSegment)
        }

        const currentPathSegment = this._recursiveDescentSegment[currentPathSegmentIndexes.CurrentCollection!]

        if (!currentPathSegment) {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'current path segment empty', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
        }

        if (currentPathSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                return currentSchema
            }

            const nextPathSegmentIndexes = PathSegmentsIndexes.create()
                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                .build()
            return this.recursiveGetDynamicSchemaNodeAtPath(nextPathSegmentIndexes, currentSchema)
        }

        let collectionKey: string
        if (currentPathSegment.IsKey && typeof currentPathSegment.Key === 'string') {
            collectionKey = currentPathSegment.Key
        } else if (currentPathSegment.IsIndex && typeof currentPathSegment.Index === 'number') {
            collectionKey = `${currentPathSegment.Index}`
        } else {
            throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'current path segment is not key or index', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
        }

        let nextPathSegmentIndexes: PathSegmentsIndexes

        switch (currentSchema.Kind) {
            case DataKinds.Map:
            case DataKinds.Object:
                if (IsMapAndNotEmpty(currentSchema.ChildNodes)) {
                    if (currentSchema.ChildNodes!.has(collectionKey)) {
                        const associativeCollectionEntrySchema = currentSchema.ChildNodes!.get(collectionKey)!

                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (associativeCollectionEntrySchema instanceof DynamicSchemaNode) {
                                return associativeCollectionEntrySchema
                            } else if (associativeCollectionEntrySchema instanceof DynamicSchema) {
                                const nextPathSegmentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                                    .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                                    .build()
                                return this.getDefaultDynamicSchemaNode(nextPathSegmentIndexes, associativeCollectionEntrySchema)
                            } else {
                                throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'unsupported schema type', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
                            }
                        }

                        try {
                            const nextPathSegmentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                                .build()
                            return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, associativeCollectionEntrySchema)
                        } catch (e) {
                        }
                    }
                }

                if (!currentSchema.ChildNodesAssociativeCollectionEntriesKeySchema || !currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema) {
                    throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'schema for associative collection keys and/or values not found', undefined, currentSchema, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
                }

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    const newAssociativeCollectionEntryKeySchema = this.recursiveGetSchemaAtPath(currentPathSegmentIndexes, currentSchema.ChildNodesAssociativeCollectionEntriesKeySchema)
                    const newAssociativeCollectionEntrySchema = this.recursiveGetSchemaAtPath(currentPathSegmentIndexes, currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema)
                    if (newAssociativeCollectionEntrySchema instanceof DynamicSchemaNode) {
                        newAssociativeCollectionEntrySchema.AssociativeCollectionEntryKeySchema = newAssociativeCollectionEntryKeySchema
                        return newAssociativeCollectionEntrySchema
                    }
                    return undefined
                }

                nextPathSegmentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                    .build()

                return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema)
            case DataKinds.Array:
                if (IsMapAndNotEmpty(currentSchema.ChildNodes)) {
                    if (currentSchema.ChildNodes!.has(collectionKey)) {
                        const linearCollectionElementSchema = currentSchema.ChildNodes!.get(collectionKey)!

                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (linearCollectionElementSchema instanceof DynamicSchemaNode) {
                                return linearCollectionElementSchema
                            } else if (linearCollectionElementSchema instanceof DynamicSchema) {
                                const nextPathSegmentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                                    .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                                    .build()
                                return this.getDefaultDynamicSchemaNode(nextPathSegmentIndexes, linearCollectionElementSchema)
                            } else {
                                throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'unsupported schema type', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
                            }
                        }

                        try {
                            const nextPathSegmentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                                .build()
                            return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, linearCollectionElementSchema)
                        } catch (e) {
                        }
                    }
                }

                if (!currentSchema.ChildNodesLinearCollectionElementsSchema) {
                    throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'schema for linear collection elements not found', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
                }

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentSchema.ChildNodesLinearCollectionElementsSchema instanceof DynamicSchemaNode) {
                        return currentSchema.ChildNodesLinearCollectionElementsSchema
                    } else if (currentSchema.ChildNodesLinearCollectionElementsSchema instanceof DynamicSchema) {
                        return this.getDefaultDynamicSchemaNode(currentPathSegmentIndexes, currentSchema.ChildNodesLinearCollectionElementsSchema)
                    } else {
                        throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'unsupported schema type', currentSchema, undefined, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
                    }
                }

                nextPathSegmentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                    .build()

                return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, currentSchema.ChildNodesLinearCollectionElementsSchema)
            case DataKinds.Set:
                if (!currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema) {
                    throw new SchemaError(SchemaErrorCodes.SchemaPathError, FunctionName, 'schema for associative collection keys and/or values not found', undefined, currentSchema, this._recursiveDescentSegment.slice(0, currentPathSegmentIndexes.CurrentCollection! + 1))
                }

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    const newAssociativeCollectionEntrySchema = this.recursiveGetSchemaAtPath(currentPathSegmentIndexes, currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema)
                    if (newAssociativeCollectionEntrySchema instanceof DynamicSchemaNode) {
                        return newAssociativeCollectionEntrySchema
                    }
                    return undefined
                }

                nextPathSegmentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection! + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection!)
                    .build()

                return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema)
            default:
                return currentSchema
        }
    }
}