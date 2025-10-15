import {ObjectError, ObjectErrorCodes, ObjModification} from './core.ts'
import {Conversion, type Converter, DataKinds, DynamicSchemaNode, type Schema, SchemaAtPath} from '@schema'
import {
    CollectionMemberSegment,
    CollectionMemberSegmentToString,
    type JSONPath,
    JsonpathKeyRoot,
    Parse,
    type RecursiveDescentSegment
} from '@path'
import {PathSegmentsIndexes, PathSegmentsIndexesBuilder} from '@internal'
import {
    IsArray,
    IsArrayAndNotEmpty,
    IsFunction,
    IsMap,
    IsNullOrUndefined,
    IsObjectLiteral,
    IsObjectLiteralAndNotEmpty,
    IsSet
} from '@core'

export interface SetObjectResult {
    Result: any
    NoOfModifications: number
    LastError?: Error
}

export class SetValue extends ObjModification {
    private _schema: Schema | undefined
    private _valueToSet: any

    constructor(defaultConverter: Converter = new Conversion(), schema?: Schema) {
        super(defaultConverter)
        this._schema = schema
    }

    public Set(root: any, jsonPath: JSONPath, valueToSet: any): SetObjectResult {
        if (jsonPath === JsonpathKeyRoot) {
            return {
                Result: root,
                NoOfModifications: 1
            }
        }

        const FunctionName = 'Set'

        this._recursiveDescentSegments = Parse(jsonPath)
        this._valueToSet = valueToSet

        let currentPathSegmentIndexesBuilder: PathSegmentsIndexesBuilder = PathSegmentsIndexes.create()
        currentPathSegmentIndexesBuilder.WithLastRecursive(this._recursiveDescentSegments.length - 1)

        if (currentPathSegmentIndexesBuilder.CurrentRecursive > currentPathSegmentIndexesBuilder.LastRecursive || currentPathSegmentIndexesBuilder.CurrentCollection > currentPathSegmentIndexesBuilder.LastCollection) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'currentPathSegmentIndexes empty', undefined, root)
        }

        currentPathSegmentIndexesBuilder.CurrentCollection = 0
        currentPathSegmentIndexesBuilder.WithLastCollection(this._recursiveDescentSegments[0].length - 1)
        if (currentPathSegmentIndexesBuilder.CurrentCollection > currentPathSegmentIndexesBuilder.LastCollection) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursiveDescentSegments empty', undefined, root)
        }

        let modifiedValue: any
        const currentPathSegmentIndexes = currentPathSegmentIndexesBuilder.build()
        if (currentPathSegmentIndexesBuilder.CurrentRecursive == currentPathSegmentIndexesBuilder.LastRecursive) {
            modifiedValue = this.recursiveSet(root, currentPathSegmentIndexes, [this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]])
        } else {
            modifiedValue = this.recursiveDescentSet(root, currentPathSegmentIndexes, [this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]])
        }

        if (this._noOfModifications > 0) {
            return {
                Result: modifiedValue,
                NoOfModifications: this._noOfModifications
            }
        }

        return {
            Result: modifiedValue,
            NoOfModifications: this._noOfModifications,
            LastError: this._lastError
        }
    }

    private recursiveSet(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): any {
        const FunctionName = 'recursiveSet'

        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'currentPathSegmentIndexes exhausted', currentPath, currentValue)
            return currentValue
        }

        const recursiveSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveSegment)) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursive segment is empty', currentPath, currentValue)
            return currentValue
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return this._valueToSet
                }

                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(0)
                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                    .build()

                return this.recursiveDescentSet(currentValue, recursiveDescentIndexes, currentPath)
            }

            const recursiveIndexes = PathSegmentsIndexes.create()
                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                .build()

            return this.recursiveSet(currentValue, recursiveIndexes, currentPath)
        }

        if (IsNullOrUndefined(currentValue)) {
            try {
                currentValue = this.getDefaultValueAtPathSegment(currentValue, currentPathSegmentIndexes, currentPath)
            } catch (e) {
                this._lastError = e as Error
                return currentValue
            }

            if (IsNullOrUndefined(currentValue)) {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'current value null or undefined', currentPath, currentValue)
                return currentValue
            }
        }

        if (IsObjectLiteral(currentValue)) {
            const currentDataKind = DataKinds.Object

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                let objectEntrySchema: DynamicSchemaNode | undefined
                try {
                    if (this._schema) {
                        objectEntrySchema = new SchemaAtPath().Get([...currentPath, recursiveSegment], this._schema)
                    }
                } catch (e) {
                }
                if (!objectEntrySchema) {
                    objectEntrySchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                }

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        try {
                            currentValue[recursiveSegment.Key] = this.convertSourceToTargetType(this._valueToSet, objectEntrySchema)
                            this._noOfModifications++
                        } catch (e) {
                            this._lastError = e as Error
                        }
                    } else {
                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[recursiveSegment.Key] = this.recursiveDescentSet(currentValue[recursiveSegment.Key], recursiveDescentIndexes, [...currentPath, recursiveSegment])
                    }
                } else {
                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[recursiveSegment.Key] = this.recursiveSet(currentValue[recursiveSegment.Key], recursiveIndexes, [...currentPath, recursiveSegment])
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const [objectKey, objectValue] of Object.entries(currentValue)) {
                    const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(objectKey).build()
                    const nextPathSegments = [...currentPath, pathSegment]

                    let objectEntrySchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            objectEntrySchema = new SchemaAtPath().Get([...currentPath, pathSegment], this._schema)
                        }
                    } catch (e) {
                    }
                    if (!objectEntrySchema) {
                        objectEntrySchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValue[pathSegment.Key!] = this.convertSourceToTargetType(this._valueToSet, objectEntrySchema)
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[pathSegment.Key!] = this.recursiveDescentSet(objectValue, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[pathSegment.Key!] = this.recursiveSet(objectValue, recursiveIndexes, nextPathSegments)
                }
            } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!unionKey.IsKey || !unionKey.Key) {
                        continue
                    }

                    let valueFromObjectLiteral = currentValue[unionKey.Key]
                    const nextPathSegments = [...currentPath, unionKey]

                    let objectEntrySchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            objectEntrySchema = new SchemaAtPath().Get([...currentPath, unionKey], this._schema)
                        }
                    } catch (e) {
                    }
                    if (!objectEntrySchema) {
                        objectEntrySchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValue[unionKey.Key!] = this.convertSourceToTargetType(this._valueToSet, objectEntrySchema)
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[unionKey.Key!] = this.recursiveDescentSet(valueFromObjectLiteral, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[unionKey.Key!] = this.recursiveSet(valueFromObjectLiteral, recursiveIndexes, nextPathSegments)
                }
            } else {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
            }
        } else if (IsMap(currentValue)) {
            const currentDataKind = DataKinds.Map
            const currentValueAsMap = currentValue as Map<any, any>

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                let mapEntrySchema: DynamicSchemaNode | undefined
                try {
                    if (this._schema) {
                        mapEntrySchema = new SchemaAtPath().Get([...currentPath, recursiveSegment], this._schema)
                    }
                } catch (e) {
                }
                if (!mapEntrySchema) {
                    mapEntrySchema = DynamicSchemaNode.create()
                        .withKind(DataKinds.Any)
                        .withAssociativeCollectionEntryKeySchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
                        .build()
                }

                if (IsObjectLiteral(mapEntrySchema.AssociativeCollectionEntryKeySchema) && mapEntrySchema.AssociativeCollectionEntryKeySchema instanceof DynamicSchemaNode) {
                    try {
                        const mapKey = this.convertSourceToTargetType(recursiveSegment.Key, mapEntrySchema.AssociativeCollectionEntryKeySchema)

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                            if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                                currentValueAsMap.set(mapKey, this._valueToSet)
                                this._noOfModifications++
                            } else {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                currentValueAsMap.set(mapKey, this.recursiveDescentSet(currentValueAsMap.get(mapKey), recursiveDescentIndexes, [...currentPath, recursiveSegment]))
                            }
                        } else {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            currentValueAsMap.set(mapKey, this.recursiveSet(currentValueAsMap.get(mapKey), recursiveIndexes, [...currentPath, recursiveSegment]))
                        }
                    } catch (e) {
                        this._lastError = e as Error
                    }
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const [mapKey, mapValue] of currentValueAsMap) {
                    const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(this.MapKeyString(mapKey)).build()
                    const nextPathSegments = [...currentPath, pathSegment]

                    let objectEntrySchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            objectEntrySchema = new SchemaAtPath().Get([...currentPath, pathSegment], this._schema)
                        }
                    } catch (e) {
                    }
                    if (!objectEntrySchema) {
                        objectEntrySchema = DynamicSchemaNode.create()
                            .withKind(DataKinds.Any)
                            .withAssociativeCollectionEntryKeySchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
                            .build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValueAsMap.set(mapKey, this.convertSourceToTargetType(this._valueToSet, objectEntrySchema))
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValueAsMap.set(mapKey, this.recursiveDescentSet(mapValue, recursiveDescentIndexes, nextPathSegments))
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValueAsMap.set(mapKey, this.recursiveSet(mapValue, recursiveIndexes, nextPathSegments))
                }
            } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!unionKey.IsKey || !unionKey.Key) {
                        continue
                    }

                    const nextPathSegments = [...currentPath, unionKey]

                    let objectEntrySchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            objectEntrySchema = new SchemaAtPath().Get([...currentPath, unionKey], this._schema)
                        }
                    } catch (e) {
                    }
                    if (!objectEntrySchema) {
                        objectEntrySchema = DynamicSchemaNode.create()
                            .withKind(DataKinds.Any)
                            .withAssociativeCollectionEntryKeySchema(DynamicSchemaNode.create().withKind(DataKinds.Any).build())
                            .build()
                    }

                    if (IsObjectLiteral(objectEntrySchema.AssociativeCollectionEntryKeySchema) && objectEntrySchema.AssociativeCollectionEntryKeySchema instanceof DynamicSchemaNode) {
                        try {
                            const mapKey = this.convertSourceToTargetType(recursiveSegment.Key, objectEntrySchema.AssociativeCollectionEntryKeySchema)
                            const valueFromMap = currentValueAsMap.get(mapKey)

                            if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                                if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                                    currentValueAsMap.set(mapKey, this._valueToSet)
                                    this._noOfModifications++
                                    continue
                                }

                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                currentValueAsMap.set(mapKey, this.recursiveDescentSet(valueFromMap, recursiveDescentIndexes, nextPathSegments))
                                continue
                            }

                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            currentValueAsMap.set(mapKey, this.recursiveSet(valueFromMap, recursiveIndexes, nextPathSegments))
                        } catch (e) {
                            this._lastError = e as Error
                        }
                    }
                }
            } else {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
            }
        } else if (IsArray(currentValue)) {
            const currentDataKind = DataKinds.Array

            if (recursiveSegment.IsIndex && typeof recursiveSegment.Index == 'number') {
                if (recursiveSegment.Index > currentValue.length - 1) {
                    for (let i = currentValue.length; i <= recursiveSegment.Index; i++) {
                        currentValue.push(undefined)
                    }
                }

                if (recursiveSegment.Index > currentValue.length) {
                    this._lastError = new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `in ${currentDataKind}, index ${CollectionMemberSegmentToString(recursiveSegment)} out of range`, currentPath, currentValue)
                    return currentValue
                }

                let arrayElementSchema: DynamicSchemaNode | undefined
                try {
                    if (this._schema) {
                        arrayElementSchema = new SchemaAtPath().Get([...currentPath, recursiveSegment], this._schema)
                    }
                } catch (e) {
                }
                if (!arrayElementSchema) {
                    arrayElementSchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                }

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        try {
                            currentValue[recursiveSegment.Index] = this.convertSourceToTargetType(this._valueToSet, arrayElementSchema)
                            this._noOfModifications++
                        } catch (e) {
                            this._lastError = e as Error
                        }
                    } else {
                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[recursiveSegment.Index] = this.recursiveDescentSet(currentValue[recursiveSegment.Index], recursiveDescentIndexes, [...currentPath, recursiveSegment])
                    }
                } else {
                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[recursiveSegment.Index] = this.recursiveSet(currentValue[recursiveSegment.Index], recursiveIndexes, [...currentPath, recursiveSegment])
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (let i = 0; i < currentValue.length; i++) {
                    const pathSegment = CollectionMemberSegment.create().WithIsIndex(true).WithIndex(i).build()
                    const nextPathSegments = [...currentPath, pathSegment]
                    const arrayElement = currentValue[i]

                    let arrayElementSchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            arrayElementSchema = new SchemaAtPath().Get(nextPathSegments, this._schema)
                        }
                    } catch (e) {
                    }
                    if (!arrayElementSchema) {
                        arrayElementSchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValue[pathSegment.Index!] = this.convertSourceToTargetType(this._valueToSet, arrayElementSchema)
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[pathSegment.Index!] = this.recursiveDescentSet(arrayElement, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[pathSegment.Index!] = this.recursiveSet(arrayElement, recursiveIndexes, nextPathSegments)
                }
            } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                let maxIndex = -1

                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!unionKey.IsIndex || typeof unionKey.Index != 'number') {
                        continue
                    }

                    if (unionKey.Index > maxIndex) {
                        maxIndex = unionKey.Index
                    }
                }

                if (maxIndex >= 0) {
                    for (let i = currentValue.length; i <= maxIndex; i++) {
                        currentValue.push(undefined)
                    }
                }

                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!unionKey.IsIndex || typeof unionKey.Index != 'number' || unionKey.Index >= currentValue.length) {
                        continue
                    }

                    let valueFromArray = currentValue[unionKey.Index]
                    const nextPathSegments = [...currentPath, unionKey]

                    let arrayElementSchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            arrayElementSchema = new SchemaAtPath().Get([...currentPath, unionKey], this._schema)
                        }
                    } catch (e) {
                    }
                    if (!arrayElementSchema) {
                        arrayElementSchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValue[unionKey.Index!] = this.convertSourceToTargetType(this._valueToSet, arrayElementSchema)
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[unionKey.Index!] = this.recursiveDescentSet(valueFromArray, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[unionKey.Index!] = this.recursiveSet(valueFromArray, recursiveIndexes, nextPathSegments)
                }
            } else if (IsObjectLiteralAndNotEmpty(recursiveSegment.LinearCollectionSelector)) {
                let start = 0
                if (recursiveSegment.LinearCollectionSelector!.IsStart && typeof recursiveSegment.LinearCollectionSelector!.Start === 'number') {
                    start = recursiveSegment.LinearCollectionSelector!.Start
                }
                let step = 1
                if (recursiveSegment.LinearCollectionSelector!.IsStep && typeof recursiveSegment.LinearCollectionSelector!.Step === 'number') {
                    step = recursiveSegment.LinearCollectionSelector!.Step
                }
                let end = currentValue.length
                if (recursiveSegment.LinearCollectionSelector!.IsEnd && typeof recursiveSegment.LinearCollectionSelector!.End === 'number') {
                    end = recursiveSegment.LinearCollectionSelector!.End
                }

                for (let i = start; i < end; i += step) {
                    const pathSegment = CollectionMemberSegment.create().WithIsIndex(true).WithIndex(i).build()
                    const nextPathSegments = [...currentPath, pathSegment]
                    const arrayElement = currentValue[i]

                    let arrayElementSchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            arrayElementSchema = new SchemaAtPath().Get([...currentPath, pathSegment], this._schema)
                        }
                    } catch (e) {
                    }
                    if (!arrayElementSchema) {
                        arrayElementSchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValue[pathSegment.Index!] = this.convertSourceToTargetType(this._valueToSet, arrayElementSchema)
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[pathSegment.Index!] = this.recursiveDescentSet(arrayElement, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[pathSegment.Index!] = this.recursiveSet(arrayElement, recursiveIndexes, nextPathSegments)
                }
            } else {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
            }
        } else if (IsSet(currentValue)) {
            const currentDataKind = DataKinds.Set

            if (recursiveSegment.IsKeyIndexAll) {
                const arrayFromSet = Array.from<any>(currentValue)
                for (let i = 0; i < arrayFromSet.length; i++) {
                    const pathSegment = CollectionMemberSegment.create().WithIsIndex(true).WithIndex(i).build()
                    const nextPathSegments = [...currentPath, pathSegment]
                    const arrayElement = arrayFromSet[i]

                    let arrayElementSchema: DynamicSchemaNode | undefined
                    try {
                        if (this._schema) {
                            arrayElementSchema = new SchemaAtPath().Get(nextPathSegments, this._schema)
                        }
                    } catch (e) {
                    }
                    if (!arrayElementSchema) {
                        arrayElementSchema = DynamicSchemaNode.create().withKind(DataKinds.Any).build()
                    }

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            try {

                                arrayFromSet[pathSegment.Index!] = this.convertSourceToTargetType(this._valueToSet, arrayElementSchema)
                                this._noOfModifications++
                            } catch (e) {
                                this._lastError = e as Error
                            }
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        arrayFromSet[pathSegment.Index!] = this.recursiveDescentSet(arrayElement, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    arrayFromSet[pathSegment.Index!] = this.recursiveSet(arrayElement, recursiveIndexes, nextPathSegments)
                }
                currentValue = new Set(arrayFromSet)
            } else {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
            }
        } else {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'unsupported value at recursive segment', currentPath, currentValue)
        }

        return currentValue
    }

    private getDefaultValueAtPathSegment(value: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): any {
        let newValue: any

        let valueSchema: DynamicSchemaNode | undefined
        try {
            if (this._schema) {
                valueSchema = new SchemaAtPath().Get(currentPath, this._schema)
            }
        } catch (e) {
        }

        if (!valueSchema) {
            newValue = this.getDefaultValueByPathSegment(value, currentPathSegmentIndexes, currentPath)
        } else if (valueSchema.IsDefaultValueSet && IsFunction(valueSchema.DefaultValue)) {
            newValue = valueSchema.DefaultValue!()
        } else {
            switch (valueSchema.Kind) {
                case DataKinds.Array:
                    newValue = []
                    break
                case DataKinds.Set:
                    newValue = new Set<any>()
                    break
                case DataKinds.Map:
                    newValue = new Map<any, any>()
                    break
                case DataKinds.Object:
                    newValue = {}
                    break
                case DataKinds.String:
                    newValue = ''
                    break
                case DataKinds.Boolean:
                    newValue = false
                    break
                case DataKinds.Number:
                    newValue = 0
                    break
                case DataKinds.Any:
                    newValue = this.getDefaultValueByPathSegment(value, currentPathSegmentIndexes, currentPath)
            }
        }

        return newValue
    }

    private getDefaultValueByPathSegment(value: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): any {
        const FunctionName = 'getDefaultValueByPathSegment'

        const currentPathSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(currentPathSegment)) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursive segment is empty', currentPath, value)
        }

        if (currentPathSegment.IsIndex || (IsArrayAndNotEmpty(currentPathSegment.UnionSelector) && currentPathSegment.UnionSelector![0].IsIndex || IsObjectLiteralAndNotEmpty(currentPathSegment.LinearCollectionSelector))) {
            return []
        } else {
            return {}
        }
    }

    private recursiveDescentSet(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): any {
        const FunctionName = 'recursiveDescentSet'

        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'currentPathSegmentIndexes exhausted', currentPath, currentValue)
            return currentValue
        }

        const recursiveDescentSearchSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveDescentSearchSegment)) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursive descent search segment is empty', currentPath, currentValue)
            return currentValue
        }

        if (IsNullOrUndefined(currentValue)) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'current value null or undefined', currentPath, currentValue)
            return currentValue
        }

        if (recursiveDescentSearchSegment.IsKeyRoot) {
            return this.recursiveSet(currentValue, currentPathSegmentIndexes, currentPath)
        }

        if (!recursiveDescentSearchSegment.IsKey) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `recursive descent search segment ${CollectionMemberSegmentToString(recursiveDescentSearchSegment)} is not key`, currentPath, currentValue)
            return currentValue
        }

        if (IsArray(currentValue)) {
            for (let i = 0; i < currentValue.length; i++) {
                const valueFromArray = currentValue[i]
                if (IsNullOrUndefined(valueFromArray)) {
                    continue
                }

                currentValue[i] = this.recursiveDescentSet(valueFromArray, currentPathSegmentIndexes, [...currentPath, {
                    Index: i,
                    IsIndex: true
                }])
            }
        } else if (IsSet(currentValue)) {
            const arrayFromSet = Array.from<any>(currentValue)
            for (let i = 0; i < arrayFromSet.length; i++) {
                const valueFromArray = arrayFromSet[i]
                if (IsNullOrUndefined(valueFromArray)) {
                    continue
                }

                arrayFromSet[i] = this.recursiveDescentSet(valueFromArray, currentPathSegmentIndexes, [...currentPath, {
                    Index: i,
                    IsIndex: true
                }])
            }
            currentValue = new Set(arrayFromSet)
        } else if (IsMap(currentValue)) {
            const currentValueAsMap = currentValue as Map<any, any>
            for (const [mapKey, mapValue] of currentValueAsMap) {
                if (IsNullOrUndefined(mapValue)) {
                    continue
                }

                try {
                    const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(this.MapKeyString(mapKey)).build()
                    const nextPathSegments = [...currentPath, pathSegment]

                    if (pathSegment.Key === recursiveDescentSearchSegment.Key) {
                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                                try {
                                    let mapValueSchema: DynamicSchemaNode | undefined
                                    if (this._schema) {
                                        mapValueSchema = new SchemaAtPath().Get([...currentPath, recursiveDescentSearchSegment], this._schema)
                                    }
                                    currentValueAsMap.set(mapKey, this.convertSourceToTargetType(this._valueToSet, mapValueSchema))
                                    this._noOfModifications++
                                } catch (e) {
                                    this._lastError = e as Error
                                }
                            } else {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                currentValueAsMap.set(mapKey, this.recursiveDescentSet(mapValue, recursiveDescentIndexes, nextPathSegments))
                            }
                        } else {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            currentValueAsMap.set(mapKey, this.recursiveSet(mapValue, recursiveIndexes, nextPathSegments))
                        }
                    } else {
                        currentValueAsMap.set(mapKey, this.recursiveDescentSet(mapValue, currentPathSegmentIndexes, nextPathSegments))
                    }
                } catch (e) {
                    this._lastError = e as Error
                }
            }
        } else if (IsObjectLiteral(currentValue)) {
            for (const [objectKey, objectValue] of Object.entries(currentValue)) {
                if (IsNullOrUndefined(objectValue)) {
                    continue
                }

                try {
                    const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(objectKey).build()
                    const nextPathSegments = [...currentPath, pathSegment]

                    if (pathSegment.Key === recursiveDescentSearchSegment.Key) {
                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                                try {
                                    let mapValueSchema: DynamicSchemaNode | undefined
                                    if (this._schema) {
                                        mapValueSchema = new SchemaAtPath().Get([...currentPath, recursiveDescentSearchSegment], this._schema)
                                    }
                                    currentValue[objectKey] = this.convertSourceToTargetType(this._valueToSet, mapValueSchema)
                                    this._noOfModifications++
                                } catch (e) {
                                    this._lastError = e as Error
                                }
                            } else {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                currentValue[objectKey] = this.recursiveDescentSet(objectValue, recursiveDescentIndexes, nextPathSegments)
                            }
                        } else {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            currentValue[objectKey] = this.recursiveSet(objectValue, recursiveIndexes, nextPathSegments)
                        }
                    } else {
                        currentValue[objectKey] = this.recursiveDescentSet(objectValue, currentPathSegmentIndexes, nextPathSegments)
                    }
                } catch (e) {
                    this._lastError = e as Error
                }
            }
        } else {
            this._lastError = new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `unsupported value at recursive descent search segment ${CollectionMemberSegmentToString(recursiveDescentSearchSegment)}`, currentPath, currentValue)
        }

        return currentValue
    }

    private convertSourceToTargetType(source: any, sourceSchema?: DynamicSchemaNode): any {
        if (!sourceSchema) {
            return source
        }

        return this._defaultConverter.Convert(source, sourceSchema, [])
    }
}