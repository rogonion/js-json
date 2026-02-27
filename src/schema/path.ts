import { Parse, type RecursiveDescentSegment, type RecursiveDescentSegments } from '@path';
import { DataKind, DynamicSchema, DynamicSchemaNode, type Schema, SchemaErrorCodes, type SchemaPath } from './core';
import { JsonError } from '@core';
import { PathSegmentsIndexes } from '@internal';

/**
 * Traverses the provided schema using the given path and returns the schema node corresponding to that path.
 *
 * @param path Expects an absolute path (starting with `$`) and does not support recursive descent `..` in the path query for schema retrieval.
 * @param schema
 * @returns
 * @throws {JsonError} with name {@link SchemaErrorCodes.SchemaPathError}
 */
export function GetSchemaAtPath<T extends SchemaPath>(path: T, schema: Schema): DynamicSchemaNode {
    let pathToSchema: RecursiveDescentSegment;

    if (typeof path === 'string') {
        const parsed = Parse(path);
        if (parsed.length === 1) {
            pathToSchema = parsed[0];
        } else {
            throw Object.assign(
                new JsonError(
                    'Parsed JSON path contains multiple recursive descent segments',
                    undefined,
                    SchemaErrorCodes.SchemaPathError
                ),
                {
                    Data: { Schema: schema }
                }
            );
        }
    } else if (Array.isArray(path)) {
        if (path.length > 0 && Array.isArray(path[0])) {
            // It's RecursiveDescentSegments
            const p = path as RecursiveDescentSegments;
            if (p.length === 1) {
                pathToSchema = p[0];
            } else {
                throw Object.assign(
                    new JsonError(
                        'path contains multiple recursive descent segments',
                        undefined,
                        SchemaErrorCodes.SchemaPathError
                    ),
                    {
                        Data: { Schema: schema }
                    }
                );
            }
        } else {
            // It's RecursiveDescentSegment
            pathToSchema = path as RecursiveDescentSegment;
        }
    } else {
        throw Object.assign(new JsonError('unsupported path type', undefined, SchemaErrorCodes.SchemaPathError), {
            Data: { Schema: schema }
        });
    }

    const traverser = new SchemaAtPath(pathToSchema);
    return traverser.recursiveGetSchemaAtPath(
        Object.assign(new PathSegmentsIndexes(), { CurrentCollection: 0, LastCollection: pathToSchema.length - 1 }),
        schema
    );
}

class SchemaAtPath {
    private _recursiveDescentSegment: RecursiveDescentSegment;

    constructor(recursiveDescentSegment: RecursiveDescentSegment) {
        this._recursiveDescentSegment = recursiveDescentSegment;
    }

    public recursiveGetSchemaAtPath(
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentSchema: Schema
    ): DynamicSchemaNode {
        if (currentSchema instanceof DynamicSchema) {
            return this.recursiveGetDynamicSchemaAtPath(currentPathSegmentIndexes, currentSchema);
        } else if (currentSchema instanceof DynamicSchemaNode) {
            return this.recursiveGetDynamicSchemaNodeAtPath(currentPathSegmentIndexes, currentSchema);
        }
        throw Object.assign(new JsonError('unsupported path type', undefined, SchemaErrorCodes.SchemaPathError), {
            Data: { Schema: currentSchema }
        });
    }

    private recursiveGetDynamicSchemaAtPath(
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentSchema: DynamicSchema
    ): DynamicSchemaNode {
        if (currentSchema.DefaultSchemaNodeKey && currentSchema.Nodes[currentSchema.DefaultSchemaNodeKey]) {
            try {
                const result = this.recursiveGetDynamicSchemaNodeAtPath(
                    currentPathSegmentIndexes,
                    currentSchema.Nodes[currentSchema.DefaultSchemaNodeKey]
                );
                currentSchema.ValidSchemaNodeKeys.push(currentSchema.DefaultSchemaNodeKey);
                return result;
            } catch (e) {
                // ignore
            }
        }

        if (Object.keys(currentSchema.Nodes).length === 0) {
            throw Object.assign(new JsonError('no schema nodes found', undefined, SchemaErrorCodes.SchemaPathError), {
                Data: {
                    Schema: currentSchema,
                    PathSegments: this._recursiveDescentSegment.slice(
                        0,
                        currentPathSegmentIndexes.CurrentCollection + 1
                    )
                }
            });
        }

        let lastError: Error | undefined;
        for (const [key, node] of Object.entries(currentSchema.Nodes)) {
            if (key === currentSchema.DefaultSchemaNodeKey) continue;
            try {
                const result = this.recursiveGetDynamicSchemaNodeAtPath(currentPathSegmentIndexes, node);
                currentSchema.ValidSchemaNodeKeys.push(key);
                return result;
            } catch (e: any) {
                lastError = e;
            }
        }

        throw (
            lastError ||
            Object.assign(new JsonError('no matching schema node found', undefined, SchemaErrorCodes.SchemaPathError), {
                Data: {
                    Schema: currentSchema,
                    PathSegments: this._recursiveDescentSegment.slice(
                        0,
                        currentPathSegmentIndexes.CurrentCollection + 1
                    )
                }
            })
        );
    }

    private getDefaultDynamicSchemaNode(
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentSchema: DynamicSchema
    ): DynamicSchemaNode {
        if (Object.keys(currentSchema.Nodes).length === 0) {
            throw Object.assign(new JsonError('no schema nodes found', undefined, SchemaErrorCodes.SchemaPathError), {
                Data: {
                    Schema: currentSchema,
                    PathSegments: this._recursiveDescentSegment.slice(
                        0,
                        currentPathSegmentIndexes.CurrentCollection + 1
                    )
                }
            });
        }

        if (currentSchema.DefaultSchemaNodeKey && currentSchema.Nodes[currentSchema.DefaultSchemaNodeKey]) {
            return currentSchema.Nodes[currentSchema.DefaultSchemaNodeKey];
        }

        return Object.values(currentSchema.Nodes)[0];
    }

    private recursiveGetDynamicSchemaNodeAtPath(
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentSchema: DynamicSchemaNode
    ): DynamicSchemaNode {
        if (currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            throw Object.assign(
                new JsonError('current path segment indexes exhausted', undefined, SchemaErrorCodes.SchemaPathError),
                {
                    Data: { Schema: currentSchema, PathSegments: this._recursiveDescentSegment }
                }
            );
        }

        const currentPathSegment = this._recursiveDescentSegment[currentPathSegmentIndexes.CurrentCollection];
        if (!currentPathSegment) {
            throw Object.assign(
                new JsonError('current path segment empty', undefined, SchemaErrorCodes.SchemaPathError),
                {
                    Data: { Schema: currentSchema }
                }
            );
        }

        if (currentPathSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                return currentSchema;
            }

            const nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                LastCollection: currentPathSegmentIndexes.LastCollection
            });
            return this.recursiveGetDynamicSchemaNodeAtPath(nextPathSegmentIndexes, currentSchema);
        }

        let collectionKey: string;
        if (currentPathSegment.Key !== undefined) {
            collectionKey = currentPathSegment.Key;
        } else if (currentPathSegment.Index !== undefined) {
            collectionKey = String(currentPathSegment.Index);
        } else {
            throw Object.assign(
                new JsonError('current path segment is not key or index', undefined, SchemaErrorCodes.SchemaPathError),
                {
                    Data: {
                        Schema: currentSchema,
                        PathSegments: this._recursiveDescentSegment.slice(
                            0,
                            currentPathSegmentIndexes.CurrentCollection + 1
                        )
                    }
                }
            );
        }

        let nextPathSegmentIndexes: PathSegmentsIndexes;
        switch (currentSchema.Kind) {
            case DataKind.Map:
                if (currentSchema.ChildNodes && currentSchema.ChildNodes[collectionKey]) {
                    const associativeCollectionEntrySchema = currentSchema.ChildNodes[collectionKey];
                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (associativeCollectionEntrySchema instanceof DynamicSchemaNode)
                            return associativeCollectionEntrySchema;
                        if (associativeCollectionEntrySchema instanceof DynamicSchema) {
                            const nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                                CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                                LastCollection: currentPathSegmentIndexes.LastCollection
                            });
                            return this.getDefaultDynamicSchemaNode(
                                nextPathSegmentIndexes,
                                associativeCollectionEntrySchema
                            );
                        }
                        throw Object.assign(
                            new JsonError('unsupported schema type', undefined, SchemaErrorCodes.SchemaPathError),
                            {
                                Data: {
                                    Schema: associativeCollectionEntrySchema,
                                    PathSegments: this._recursiveDescentSegment.slice(
                                        0,
                                        currentPathSegmentIndexes.CurrentCollection + 1
                                    )
                                }
                            }
                        );
                    }

                    nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                        CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                        LastCollection: currentPathSegmentIndexes.LastCollection
                    });
                    return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, associativeCollectionEntrySchema);
                }

                if (
                    !currentSchema.ChildNodesAssociativeCollectionEntriesKeySchema ||
                    !currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema
                ) {
                    throw Object.assign(
                        new JsonError(
                            'schema for associative collection keys and/or values not found',
                            undefined,
                            SchemaErrorCodes.SchemaPathError
                        ),
                        {
                            Data: {
                                Schema: currentSchema,
                                PathSegments: this._recursiveDescentSegment.slice(
                                    0,
                                    currentPathSegmentIndexes.CurrentCollection + 1
                                )
                            }
                        }
                    );
                }

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    const newAssociativeCollectionEntryKeySchema = this.recursiveGetSchemaAtPath(
                        currentPathSegmentIndexes,
                        currentSchema.ChildNodesAssociativeCollectionEntriesKeySchema
                    );
                    const newAssociativeCollectionEntrySchema = this.recursiveGetSchemaAtPath(
                        currentPathSegmentIndexes,
                        currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema
                    );

                    newAssociativeCollectionEntrySchema.AssociativeCollectionEntryKeySchema =
                        newAssociativeCollectionEntryKeySchema;
                    return newAssociativeCollectionEntrySchema;
                }

                nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                    CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                    LastCollection: currentPathSegmentIndexes.LastCollection
                });
                return this.recursiveGetSchemaAtPath(
                    nextPathSegmentIndexes,
                    currentSchema.ChildNodesAssociativeCollectionEntriesValueSchema
                );
            case DataKind.Array:
            case DataKind.Set:
                if (currentSchema.ChildNodes && currentSchema.ChildNodes[collectionKey]) {
                    const elementSchema = currentSchema.ChildNodes[collectionKey];
                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (elementSchema instanceof DynamicSchemaNode) return elementSchema;
                        if (elementSchema instanceof DynamicSchema) {
                            const nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                                CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                                LastCollection: currentPathSegmentIndexes.LastCollection
                            });
                            return this.getDefaultDynamicSchemaNode(nextPathSegmentIndexes, elementSchema);
                        }
                        throw Object.assign(
                            new JsonError('unsupported schema type', undefined, SchemaErrorCodes.SchemaPathError),
                            {
                                Data: {
                                    Schema: elementSchema,
                                    PathSegments: this._recursiveDescentSegment.slice(
                                        0,
                                        currentPathSegmentIndexes.CurrentCollection + 1
                                    )
                                }
                            }
                        );
                    }

                    nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                        CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                        LastCollection: currentPathSegmentIndexes.LastCollection
                    });
                    return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, elementSchema);
                }

                if (!currentSchema.ChildNodesLinearCollectionElementsSchema) {
                    throw Object.assign(
                        new JsonError(
                            'schema for linear collection elements not found',
                            undefined,
                            SchemaErrorCodes.SchemaPathError
                        ),
                        {
                            Data: {
                                Schema: currentSchema,
                                PathSegments: this._recursiveDescentSegment.slice(
                                    0,
                                    currentPathSegmentIndexes.CurrentCollection + 1
                                )
                            }
                        }
                    );
                }

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    const elementSchema = currentSchema.ChildNodesLinearCollectionElementsSchema;
                    if (elementSchema instanceof DynamicSchemaNode) return elementSchema;
                    if (elementSchema instanceof DynamicSchema)
                        return this.getDefaultDynamicSchemaNode(currentPathSegmentIndexes, elementSchema);
                    throw Object.assign(
                        new JsonError('unsupported schema type', undefined, SchemaErrorCodes.SchemaPathError),
                        {
                            Data: {
                                Schema: elementSchema,
                                PathSegments: this._recursiveDescentSegment.slice(
                                    0,
                                    currentPathSegmentIndexes.CurrentCollection + 1
                                )
                            }
                        }
                    );
                }

                nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                    CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                    LastCollection: currentPathSegmentIndexes.LastCollection
                });
                return this.recursiveGetSchemaAtPath(
                    nextPathSegmentIndexes,
                    currentSchema.ChildNodesLinearCollectionElementsSchema
                );

            case DataKind.Object:
                if (!currentSchema.ChildNodes) {
                    throw Object.assign(
                        new JsonError('schema child nodes empty', undefined, SchemaErrorCodes.SchemaPathError),
                        {
                            Data: {
                                Schema: currentSchema,
                                PathSegments: this._recursiveDescentSegment.slice(
                                    0,
                                    currentPathSegmentIndexes.CurrentCollection + 1
                                )
                            }
                        }
                    );
                }

                if (currentSchema.ChildNodes[collectionKey]) {
                    const fieldSchema = currentSchema.ChildNodes[collectionKey];
                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (fieldSchema instanceof DynamicSchemaNode) return fieldSchema;
                        if (fieldSchema instanceof DynamicSchema) {
                            const nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                                CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                                LastCollection: currentPathSegmentIndexes.LastCollection
                            });
                            return this.getDefaultDynamicSchemaNode(nextPathSegmentIndexes, fieldSchema);
                        }
                        throw Object.assign(
                            new JsonError('unsupported schema type', undefined, SchemaErrorCodes.SchemaPathError),
                            {
                                Data: {
                                    Schema: fieldSchema,
                                    PathSegments: this._recursiveDescentSegment.slice(
                                        0,
                                        currentPathSegmentIndexes.CurrentCollection + 1
                                    )
                                }
                            }
                        );
                    }
                    nextPathSegmentIndexes = Object.assign(new PathSegmentsIndexes(), {
                        CurrentCollection: currentPathSegmentIndexes.CurrentCollection + 1,
                        LastCollection: currentPathSegmentIndexes.LastCollection
                    });
                    return this.recursiveGetSchemaAtPath(nextPathSegmentIndexes, fieldSchema);
                }

                throw Object.assign(
                    new JsonError(
                        `schema for object field ${collectionKey} not found`,
                        undefined,
                        SchemaErrorCodes.SchemaPathError
                    ),
                    {
                        Data: {
                            Schema: currentSchema,
                            PathSegments: this._recursiveDescentSegment.slice(
                                0,
                                currentPathSegmentIndexes.CurrentCollection + 1
                            )
                        }
                    }
                );

            default:
                return currentSchema;
        }
    }
}
