import {ObjectError, ObjectErrorCodes, ObjModification} from './core.ts'
import {Conversion, type Converter, DataKinds} from '@schema'
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
    IsMap,
    IsNullOrUndefined,
    IsObjectLiteral,
    IsObjectLiteralAndNotEmpty,
    IsSet
} from '@core'

export interface DeleteObjectResult {
    Result: any
    NoOfModifications: number
    LastError?: Error
}

export class DeleteValue extends ObjModification {
    constructor(defaultConverter: Converter = new Conversion()) {
        super(defaultConverter)
    }

    public Delete(root: any, jsonPath: JSONPath): DeleteObjectResult {
        if (jsonPath === JsonpathKeyRoot) {
            return {
                Result: undefined,
                NoOfModifications: 1
            }
        }

        const FunctionName = 'Delete'

        this._recursiveDescentSegments = Parse(jsonPath)

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
            modifiedValue = this.recursiveDelete(root, currentPathSegmentIndexes, [this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]])
        } else {
            modifiedValue = this.recursiveDescentDelete(root, currentPathSegmentIndexes, [this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]])
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

    private recursiveDelete(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): any {
        const FunctionName = 'recursiveDelete'

        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'currentPathSegmentIndexes exhausted', currentPath, currentValue)
            return currentValue
        }

        const recursiveSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveSegment)) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursive segment is empty', currentPath, currentValue)
            return currentValue
        }

        if (IsNullOrUndefined(currentValue)) {
            this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'current value null or undefined', currentPath, currentValue)
            return currentValue
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return undefined
                }

                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(0)
                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                    .build()

                return this.recursiveDescentDelete(currentValue, recursiveDescentIndexes, currentPath)
            }

            const recursiveIndexes = PathSegmentsIndexes.create()
                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                .build()

            return this.recursiveDelete(currentValue, recursiveIndexes, currentPath)
        }

        if (IsObjectLiteral(currentValue)) {
            const currentDataKind = DataKinds.Object

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        delete currentValue[recursiveSegment.Key]
                        this._noOfModifications++
                    } else {
                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[recursiveSegment.Key] = this.recursiveDescentDelete(currentValue[recursiveSegment.Key], recursiveDescentIndexes, [...currentPath, recursiveSegment])
                    }
                } else {
                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[recursiveSegment.Key] = this.recursiveDelete(currentValue[recursiveSegment.Key], recursiveIndexes, [...currentPath, recursiveSegment])
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const [objectKey, objectValue] of Object.entries(currentValue)) {
                    const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(objectKey).build()
                    const nextPathSegments = [...currentPath, pathSegment]

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            delete currentValue[pathSegment.Key!]
                            this._noOfModifications++
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[pathSegment.Key!] = this.recursiveDescentDelete(objectValue, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[pathSegment.Key!] = this.recursiveDelete(objectValue, recursiveIndexes, nextPathSegments)
                }
            } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!unionKey.IsKey || !unionKey.Key) {
                        continue
                    }

                    let valueFromObjectLiteral = currentValue[unionKey.Key]
                    const nextPathSegments = [...currentPath, unionKey]

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            delete currentValue[unionKey.Key!]
                            this._noOfModifications++
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[unionKey.Key!] = this.recursiveDescentDelete(valueFromObjectLiteral, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[unionKey.Key!] = this.recursiveDelete(valueFromObjectLiteral, recursiveIndexes, nextPathSegments)
                }
            } else {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
            }
        } else if (IsMap(currentValue)) {
            const currentDataKind = DataKinds.Map

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                const newMap = new Map<any, any>()

                for (const [mapKey, mapValue] of currentValue as Map<any, any>) {
                    if (this.MapKeyString(mapKey) === recursiveSegment.Key) {
                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                            if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                                this._noOfModifications++
                                continue
                            }
                            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(0)
                                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                .build()

                            newMap.set(mapKey, this.recursiveDescentDelete(mapValue, recursiveDescentIndexes, [...currentPath, recursiveSegment]))
                            continue
                        }
                        const recursiveIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                            .build()

                        newMap.set(mapKey, this.recursiveDelete(mapValue, recursiveIndexes, [...currentPath, recursiveSegment]))
                        continue
                    }
                    newMap.set(mapKey, mapValue)
                }

                currentValue = newMap
            } else if (recursiveSegment.IsKeyIndexAll) {
                const newMap = new Map<any, any>()

                for (const [mapKey, mapValue] of currentValue as Map<any, any>) {
                    const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(this.MapKeyString(mapKey)).build()
                    const nextPathSegments = [...currentPath, pathSegment]

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            this._noOfModifications++
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        newMap.set(mapKey, this.recursiveDescentDelete(mapValue, recursiveDescentIndexes, nextPathSegments))
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    newMap.set(mapKey, this.recursiveDelete(mapValue, recursiveIndexes, nextPathSegments))
                }

                currentValue = newMap
            } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                const newMap = new Map<any, any>()

                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!unionKey.IsKey || !unionKey.Key) {
                        continue
                    }

                    const nextPathSegments = [...currentPath, unionKey]

                    for (const [mapKey, mapValue] of currentValue as Map<any, any>) {
                        if (this.MapKeyString(mapKey) === recursiveSegment.Key) {
                            if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                                if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                                    this._noOfModifications++
                                    continue
                                }

                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                newMap.set(mapKey, this.recursiveDescentDelete(mapValue, recursiveDescentIndexes, nextPathSegments))
                                continue
                            }

                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            newMap.set(mapKey, this.recursiveDelete(mapValue, recursiveIndexes, nextPathSegments))
                            continue
                        }
                        newMap.set(mapKey, mapValue)
                    }
                }

                currentValue = newMap
            } else {
                this._lastError = new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
            }
        } else if (IsArray(currentValue)) {
            const currentDataKind = DataKinds.Array

            if (recursiveSegment.IsIndex && typeof recursiveSegment.Index == 'number') {
                if (recursiveSegment.Index >= currentValue.length) {
                    this._lastError = new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `in ${currentDataKind}, index ${CollectionMemberSegmentToString(recursiveSegment)} out of range`, currentPath, currentValue)
                    return currentValue
                }

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        currentValue = (currentValue as any[]).filter((_, index) => recursiveSegment.Index !== index)
                        this._noOfModifications++
                    } else {
                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        currentValue[recursiveSegment.Index] = this.recursiveDescentDelete(currentValue[recursiveSegment.Index], recursiveDescentIndexes, [...currentPath, recursiveSegment])
                    }
                } else {
                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    currentValue[recursiveSegment.Index] = this.recursiveDelete(currentValue[recursiveSegment.Index], recursiveIndexes, [...currentPath, recursiveSegment])
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection && currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                    this._noOfModifications += currentValue.length
                    currentValue = []
                } else {
                    for (let i = 0; i < currentValue.length; i++) {
                        const pathSegment = CollectionMemberSegment.create().WithIsIndex(true).WithIndex(i).build()
                        const nextPathSegments = [...currentPath, pathSegment]
                        const arrayElement = currentValue[i]

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(0)
                                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                .build()

                            currentValue[pathSegment.Index!] = this.recursiveDescentDelete(arrayElement, recursiveDescentIndexes, nextPathSegments)
                            continue
                        }

                        const recursiveIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                            .build()

                        currentValue[pathSegment.Index!] = this.recursiveDelete(arrayElement, recursiveIndexes, nextPathSegments)
                    }
                }
            } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection && currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                    let indexesToExclude: number[] = []

                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!unionKey.IsIndex || typeof unionKey.Index != 'number') {
                            continue
                        }
                        if (unionKey.Index >= currentValue.length) {
                            continue
                        }
                        indexesToExclude.push(unionKey.Index)
                    }

                    if (indexesToExclude.length > 0) {
                        currentValue = (currentValue as any[]).filter((_, index) => !indexesToExclude.includes(index))
                        this._noOfModifications += indexesToExclude.length
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!unionKey.IsIndex || typeof unionKey.Index != 'number' || unionKey.Index >= currentValue.length) {
                            continue
                        }

                        let valueFromArray = currentValue[unionKey.Index]
                        const nextPathSegments = [...currentPath, unionKey]

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(0)
                                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                .build()

                            currentValue[unionKey.Index!] = this.recursiveDescentDelete(valueFromArray, recursiveDescentIndexes, nextPathSegments)
                            continue
                        }

                        const recursiveIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                            .build()

                        currentValue[unionKey.Index!] = this.recursiveDelete(valueFromArray, recursiveIndexes, nextPathSegments)
                    }
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

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection && currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                    let indexesToExclude: number[] = []

                    for (let i = start; i < end; i += step) {
                        if (i >= currentValue.length) {
                            continue
                        }
                        indexesToExclude.push(i)
                    }

                    if (indexesToExclude.length > 0) {
                        currentValue = (currentValue as any[]).filter((_, index) => !indexesToExclude.includes(index))
                        this._noOfModifications += indexesToExclude.length
                    }
                } else {
                    for (let i = start; i < end; i += step) {
                        const pathSegment = CollectionMemberSegment.create().WithIsIndex(true).WithIndex(i).build()
                        const nextPathSegments = [...currentPath, pathSegment]
                        const arrayElement = currentValue[i]

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(0)
                                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                .build()

                            currentValue[pathSegment.Index!] = this.recursiveDescentDelete(arrayElement, recursiveDescentIndexes, nextPathSegments)
                            continue
                        }

                        const recursiveIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                            .build()

                        currentValue[pathSegment.Index!] = this.recursiveDescentDelete(arrayElement, recursiveIndexes, nextPathSegments)
                    }
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

                    if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                            this._noOfModifications++
                            continue
                        }

                        const recursiveDescentIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(0)
                            .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                            .build()

                        arrayFromSet[pathSegment.Index!] = this.recursiveDescentDelete(arrayElement, recursiveDescentIndexes, nextPathSegments)
                        continue
                    }

                    const recursiveIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                        .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                        .build()

                    arrayFromSet[pathSegment.Index!] = this.recursiveDescentDelete(arrayElement, recursiveIndexes, nextPathSegments)
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

    private recursiveDescentDelete(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): any {
        const FunctionName = 'recursiveDescentDelete'

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
            return this.recursiveDelete(currentValue, currentPathSegmentIndexes, currentPath)
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

                currentValue[i] = this.recursiveDescentDelete(valueFromArray, currentPathSegmentIndexes, [...currentPath, {
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

                arrayFromSet[i] = this.recursiveDescentDelete(valueFromArray, currentPathSegmentIndexes, [...currentPath, {
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
                                currentValueAsMap.delete(mapKey)
                                this._noOfModifications++
                            } else {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                currentValueAsMap.set(mapKey, this.recursiveDescentDelete(mapValue, recursiveDescentIndexes, nextPathSegments))
                            }
                        } else {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            currentValueAsMap.set(mapKey, this.recursiveDelete(mapValue, recursiveIndexes, nextPathSegments))
                        }
                    } else {
                        currentValueAsMap.set(mapKey, this.recursiveDescentDelete(mapValue, currentPathSegmentIndexes, nextPathSegments))
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
                                delete currentValue[objectKey]
                                this._noOfModifications++
                            } else {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                currentValue[objectKey] = this.recursiveDescentDelete(objectValue, recursiveDescentIndexes, nextPathSegments)
                            }
                        } else {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            currentValue[objectKey] = this.recursiveDelete(objectValue, recursiveIndexes, nextPathSegments)
                        }
                    } else {
                        currentValue[objectKey] = this.recursiveDescentDelete(objectValue, currentPathSegmentIndexes, nextPathSegments)
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
}