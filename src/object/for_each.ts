import {CollectionMemberSegment, type JSONPath, Parse, type RecursiveDescentSegment} from '@path'
import {Obj, ObjectError, ObjectErrorCodes} from './core.ts'
import {Conversion, type Converter} from '@schema'
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
import {PathSegmentsIndexes, PathSegmentsIndexesBuilder} from '@internal'

export class ForEachValue extends Obj {
    private _ifValueFoundInObject: IfValueFoundInObject | undefined

    constructor(defaultConverter: Converter = new Conversion()) {
        super(defaultConverter)
    }

    public ForEach(root: any, jsonPath: JSONPath, ifValueFoundInObject: IfValueFoundInObject) {
        const FunctionName = 'ForEach'

        if (!IsFunction(ifValueFoundInObject)) {
            throw new ObjectError(ObjectErrorCodes.ObjectProcessorError, FunctionName, 'ifValueFoundInObject not a function', undefined, root)
        }
        this._ifValueFoundInObject = ifValueFoundInObject!

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

        if (currentPathSegmentIndexesBuilder.CurrentRecursive == currentPathSegmentIndexesBuilder.LastRecursive) {
            this.recursiveForEach(root, currentPathSegmentIndexesBuilder.build(), [])
        } else {
            this.recursiveDescentForEach(root, currentPathSegmentIndexesBuilder.build(), [])
        }
    }

    private recursiveForEach(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): boolean {
        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            return false
        }

        if (IsNullOrUndefined(currentValue)) {
            return false
        }

        const recursiveSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveSegment)) {
            return false
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return this._ifValueFoundInObject!(currentPath, currentValue)
                }

                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(0)
                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                    .build()

                return this.recursiveDescentForEach(currentValue, recursiveDescentIndexes, currentPath)
            }

            const recursiveIndexes = PathSegmentsIndexes.create()
                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                .build()

            return this.recursiveForEach(currentValue, recursiveIndexes, currentPath)
        }

        if (IsObjectLiteral(currentValue)) {
            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                const valueFromObjectLiteral = currentValue[recursiveSegment.Key]

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        if (!IsNullOrUndefined(valueFromObjectLiteral)) {
                            return this._ifValueFoundInObject!([...currentPath, recursiveSegment], valueFromObjectLiteral)
                        }
                        return false
                    }

                    const recursiveDescentIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(0)
                        .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                        .build()

                    return this.recursiveDescentForEach(valueFromObjectLiteral, recursiveDescentIndexes, [...currentPath, recursiveSegment])
                }

                const recursiveIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                    .build()

                return this.recursiveForEach(valueFromObjectLiteral, recursiveIndexes, [...currentPath, recursiveSegment])
            }

            if (recursiveSegment.IsKeyIndexAll || IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                let selectorArray: any[] = []
                let selectorArrayElementPaths: RecursiveDescentSegment = []

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const [objectKey, objectValue] of Object.entries(currentValue)) {
                        if (!IsNullOrUndefined(objectValue)) {
                            selectorArray.push(objectValue)
                            selectorArrayElementPaths.push(CollectionMemberSegment.create().WithKey(objectKey).WithIsKey(true).build())
                        }
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!unionKey.IsKey || !unionKey.Key) {
                            continue
                        }

                        let valueFromObjectLiteral = currentValue[unionKey.Key]
                        if (!IsNullOrUndefined(valueFromObjectLiteral)) {
                            selectorArray.push(valueFromObjectLiteral)
                            selectorArrayElementPaths.push(unionKey)
                        }
                    }
                }

                return this.selectorLoop(selectorArray, selectorArrayElementPaths, currentPathSegmentIndexes, currentPath)
            }

            return false
        }

        if (IsMap(currentValue)) {
            const objectFromCurrentValueMap = Object.fromEntries(currentValue as Map<any, any>)

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                const valueFromObjectLiteral = objectFromCurrentValueMap[recursiveSegment.Key]

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        if (!IsNullOrUndefined(valueFromObjectLiteral)) {
                            return this._ifValueFoundInObject!([...currentPath, recursiveSegment], valueFromObjectLiteral)
                        }
                        return false
                    }

                    const recursiveDescentIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(0)
                        .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                        .build()

                    return this.recursiveDescentForEach(valueFromObjectLiteral, recursiveDescentIndexes, [...currentPath, recursiveSegment])
                }

                const recursiveIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                    .build()

                return this.recursiveForEach(valueFromObjectLiteral, recursiveIndexes, [...currentPath, recursiveSegment])
            }

            if (recursiveSegment.IsKeyIndexAll || IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                let selectorArray: any[] = []
                let selectorArrayElementPaths: RecursiveDescentSegment = []

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const [objectKey, objectValue] of Object.entries(objectFromCurrentValueMap)) {
                        if (!IsNullOrUndefined(objectValue)) {
                            selectorArray.push(objectValue)
                            selectorArrayElementPaths.push(CollectionMemberSegment.create().WithKey(objectKey).WithIsKey(true).build())
                        }
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!unionKey.IsKey || !unionKey.Key) {
                            continue
                        }

                        let valueFromObjectLiteral = objectFromCurrentValueMap[unionKey.Key]
                        if (!IsNullOrUndefined(valueFromObjectLiteral)) {
                            selectorArray.push(valueFromObjectLiteral)
                            selectorArrayElementPaths.push(unionKey)
                        }
                    }
                }

                return this.selectorLoop(selectorArray, selectorArrayElementPaths, currentPathSegmentIndexes, currentPath)
            }

            return false
        }

        if (IsArray(currentValue)) {
            if (recursiveSegment.IsIndex && typeof recursiveSegment.Index == 'number') {
                if (recursiveSegment.Index >= currentValue.length) {
                    return false
                }

                const valueFromArray = currentValue[recursiveSegment.Index]

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        if (!IsNullOrUndefined(valueFromArray)) {
                            return this._ifValueFoundInObject!([...currentPath, recursiveSegment], valueFromArray)
                        }
                        return false
                    }

                    const recursiveDescentIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(0)
                        .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                        .build()

                    return this.recursiveDescentForEach(valueFromArray, recursiveDescentIndexes, [...currentPath, recursiveSegment])
                }

                const recursiveIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                    .build()

                return this.recursiveForEach(valueFromArray, recursiveIndexes, [...currentPath, recursiveSegment])
            }

            if (recursiveSegment.IsKeyIndexAll || IsArrayAndNotEmpty(recursiveSegment.UnionSelector) || IsObjectLiteralAndNotEmpty(recursiveSegment.LinearCollectionSelector)) {
                let selectorArray: any[] = []
                let selectorArrayElementPaths: RecursiveDescentSegment = []

                if (recursiveSegment.IsKeyIndexAll) {
                    for (let i = 0; i < currentValue.length; i++) {
                        const arrayElement = currentValue[i]
                        if (!IsNullOrUndefined(arrayElement)) {
                            selectorArray.push(arrayElement)
                            selectorArrayElementPaths.push(CollectionMemberSegment.create().WithIndex(i).WithIsIndex(true).build())
                        }
                    }
                } else if (IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!unionKey.IsIndex || typeof unionKey.Index != 'number' || unionKey.Index >= currentValue.length) {
                            continue
                        }

                        let valueFromArray = currentValue[unionKey.Index]
                        if (!IsNullOrUndefined(valueFromArray)) {
                            selectorArray.push(valueFromArray)
                            selectorArrayElementPaths.push(unionKey)
                        }
                    }
                } else {
                    let start = 0
                    if (recursiveSegment.LinearCollectionSelector!.IsStart && typeof recursiveSegment.LinearCollectionSelector!.Start === 'number') {
                        if (recursiveSegment.LinearCollectionSelector!.Start >= currentValue.length) {
                            return false
                        }
                        start = recursiveSegment.LinearCollectionSelector!.Start!
                    }
                    let step = 1
                    if (recursiveSegment.LinearCollectionSelector!.IsStep && typeof recursiveSegment.LinearCollectionSelector!.Step === 'number') {
                        if (recursiveSegment.LinearCollectionSelector!.Step >= currentValue.length) {
                            return false
                        }
                        step = recursiveSegment.LinearCollectionSelector!.Step
                    }
                    let end = currentValue.length
                    if (recursiveSegment.LinearCollectionSelector!.IsEnd && typeof recursiveSegment.LinearCollectionSelector!.End === 'number') {
                        if (recursiveSegment.LinearCollectionSelector!.End >= currentValue.length) {
                            return false
                        }
                        end = recursiveSegment.LinearCollectionSelector!.End
                    }

                    for (let i = start; i < end; i += step) {
                        if (i >= currentValue.length) {
                            continue
                        }

                        let valueFromArray = currentValue[i]
                        if (!IsNullOrUndefined(valueFromArray)) {
                            selectorArray.push(valueFromArray)
                            selectorArrayElementPaths.push(CollectionMemberSegment.create().WithIndex(i).WithIsIndex(true).build())
                        }
                    }
                }

                return this.selectorLoop(selectorArray, selectorArrayElementPaths, currentPathSegmentIndexes, currentPath)
            }

            return false
        }

        if (IsSet(currentValue)) {
            if (recursiveSegment.IsKeyIndexAll) {
                let selectorArray: any[] = []
                let selectorArrayElementPaths: RecursiveDescentSegment = []

                let i = 0
                for (const setEntry of currentValue as Set<any>) {
                    if (!IsNullOrUndefined(setEntry)) {
                        selectorArray.push(setEntry)
                        selectorArrayElementPaths.push(CollectionMemberSegment.create().WithIndex(i).WithIsIndex(true).build())
                    }
                    i++
                }

                return this.selectorLoop(selectorArray, selectorArrayElementPaths, currentPathSegmentIndexes, currentPath)
            }

            return false
        }

        return false
    }

    private selectorLoop(selectorArray: any, selectorArrayElementPaths: RecursiveDescentSegment, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): boolean {
        if (selectorArray.length === 0) {
            return false
        }

        for (let i = 0; i < selectorArrayElementPaths.length; i++) {
            const nextPathSegments = [...currentPath, selectorArrayElementPaths[i]]
            const selectorArrayElement = selectorArray[i]
            if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                    if (this._ifValueFoundInObject!(nextPathSegments, selectorArrayElement)) {
                        return true
                    }
                    continue
                }

                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(0)
                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                    .build()

                if (this.recursiveDescentForEach(selectorArrayElement, recursiveDescentIndexes, nextPathSegments)) {
                    return true
                }
                continue
            }

            const recursiveIndexes = PathSegmentsIndexes.create()
                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                .build()

            if (this.recursiveForEach(selectorArrayElement, recursiveIndexes, nextPathSegments)) {
                return true
            }
        }

        return false
    }

    private recursiveDescentForEach(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): boolean {
        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            return false
        }

        if (IsNullOrUndefined(currentValue)) {
            return false
        }

        const recursiveDescentSearchSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveDescentSearchSegment)) {
            return false
        }

        if (recursiveDescentSearchSegment.IsKeyRoot) {
            return this.recursiveForEach(currentValue, currentPathSegmentIndexes, [...currentPath, recursiveDescentSearchSegment])
        }

        if (!recursiveDescentSearchSegment.IsKey) {
            return false
        }

        if (IsArray(currentValue)) {
            for (let i = 0; i < currentValue.length; i++) {
                let valueFromArray = currentValue[i]
                if (IsNullOrUndefined(valueFromArray)) {
                    continue
                }

                if (this.recursiveDescentForEach(valueFromArray, currentPathSegmentIndexes, [...currentPath, {
                    Index: i,
                    IsIndex: true
                }])) {
                    return true
                }
            }
        } else if (IsSet(currentValue)) {
            let i = 0
            for (const setEntry of currentValue as Set<any>) {
                if (IsNullOrUndefined(setEntry)) {
                    continue
                }

                if (this.recursiveDescentForEach(setEntry, currentPathSegmentIndexes, [...currentPath, {
                    Index: i,
                    IsIndex: true
                }])) {
                    return true
                }
            }
        } else if (IsMap(currentValue)) {
            for (const [objectKey, objectValue] of Object.entries(Object.fromEntries(currentValue as Map<any, any>))) {
                if (IsNullOrUndefined(objectValue)) {
                    continue
                }

                const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(this.MapKeyString(objectKey)).build()
                const nextPathSegments = [...currentPath, pathSegment]

                if (pathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            if (this._ifValueFoundInObject!(nextPathSegments, objectValue)) {
                                return true
                            }
                        } else {
                            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(0)
                                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                .build()

                            if (this.recursiveDescentForEach(objectValue, recursiveDescentIndexes, nextPathSegments)) {
                                return true
                            }
                        }
                    } else {
                        const recursiveIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                            .build()

                        if (this.recursiveForEach(objectValue, recursiveIndexes, nextPathSegments)) {
                            return true
                        }
                    }
                }

                if (this.recursiveDescentForEach(objectValue, currentPathSegmentIndexes, nextPathSegments)) {
                    return true
                }
            }
        } else if (IsObjectLiteral(currentValue)) {
            for (const [objectKey, objectValue] of Object.entries(currentValue)) {
                if (IsNullOrUndefined(objectValue)) {
                    continue
                }

                const pathSegment = CollectionMemberSegment.create().WithIsKey(true).WithKey(this.MapKeyString(objectKey)).build()
                const nextPathSegments = [...currentPath, pathSegment]

                if (pathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            if (this._ifValueFoundInObject!(nextPathSegments, objectValue)) {
                                return true
                            }
                        } else {
                            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(0)
                                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                .build()

                            if (this.recursiveDescentForEach(objectValue, recursiveDescentIndexes, nextPathSegments)) {
                                return true
                            }
                        }
                    } else {
                        const recursiveIndexes = PathSegmentsIndexes.create()
                            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                            .build()

                        if (this.recursiveForEach(objectValue, recursiveIndexes, nextPathSegments)) {
                            return true
                        }
                    }
                }

                if (this.recursiveDescentForEach(objectValue, currentPathSegmentIndexes, nextPathSegments)) {
                    return true
                }
            }
        }

        return false
    }
}

export type IfValueFoundInObject = (jsonPath: RecursiveDescentSegment, value: any) => boolean