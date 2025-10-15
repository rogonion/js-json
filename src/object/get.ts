import {Obj, ObjectError, ObjectErrorCodes} from './core.ts'
import {
    CollectionMemberSegment,
    CollectionMemberSegmentToString,
    type JSONPath,
    JsonpathKeyRoot,
    Parse,
    type RecursiveDescentSegment
} from '@path'
import {PathSegmentsIndexes, PathSegmentsIndexesBuilder} from '@internal'
import {Conversion, type Converter, type DataKind, DataKinds} from '@schema'
import {
    IsArray,
    IsArrayAndNotEmpty,
    IsMap,
    IsNullOrUndefined,
    IsObjectLiteral,
    IsObjectLiteralAndNotEmpty,
    IsSet
} from '@core'

export interface GetObjectResult {
    Result: any
    Ok: boolean
}

export class GetValue extends Obj {
    constructor(defaultConverter: Converter = new Conversion()) {
        super(defaultConverter)
    }

    public Get(root: any, jsonPath: JSONPath): GetObjectResult {
        if (jsonPath === JsonpathKeyRoot) {
            return {
                Result: root,
                Ok: true
            }
        }

        const FunctionName = 'Get'

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
            return this.recursiveGet(root, currentPathSegmentIndexesBuilder.build(), [])
        }

        return this.recursiveDescentGet(root, currentPathSegmentIndexesBuilder.build(), [])
    }

    private recursiveGet(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): GetObjectResult {
        const FunctionName = 'recursiveGet'

        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'currentPathSegmentIndexes exhausted', currentPath, currentValue)
        }

        const recursiveSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveSegment)) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursive segment is empty', currentPath, currentValue)
        }

        if (IsNullOrUndefined(currentValue)) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'current value null or undefined', currentPath, currentValue)
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return {
                        Result: currentValue,
                        Ok: true
                    }
                }

                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(0)
                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                    .build()

                return this.recursiveDescentGet(currentValue, recursiveDescentIndexes, currentPath)
            }

            const recursiveIndexes = PathSegmentsIndexes.create()
                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                .build()

            return this.recursiveGet(currentValue, recursiveIndexes, currentPath)
        }

        if (IsObjectLiteral(currentValue)) {
            const currentDataKind = DataKinds.Object

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                const valueFromObjectLiteral = currentValue[recursiveSegment.Key]

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        if (!IsNullOrUndefined(valueFromObjectLiteral)) {
                            return {
                                Result: valueFromObjectLiteral,
                                Ok: true
                            }
                        }
                        throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `value of ${currentDataKind} entry ${recursiveSegment.Key} not valid`, currentPath, currentValue)
                    }

                    const recursiveDescentIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(0)
                        .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                        .build()

                    return this.recursiveDescentGet(valueFromObjectLiteral, recursiveDescentIndexes, [...currentPath, recursiveSegment])
                }

                const recursiveIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                    .build()

                return this.recursiveGet(valueFromObjectLiteral, recursiveIndexes, [...currentPath, recursiveSegment])
            }

            if (recursiveSegment.IsKeyIndexAll || IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                let selectorArray: any[] = []

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const objectValue of Object.values(currentValue)) {
                        if (!IsNullOrUndefined(objectValue)) {
                            selectorArray.push(objectValue)
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
                        }
                    }
                }

                return this.selectorLoop(currentDataKind, selectorArray, recursiveSegment, currentValue, currentPathSegmentIndexes, currentPath)
            }

            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
        }

        if (IsMap(currentValue)) {
            const currentDataKind = DataKinds.Map
            const objectFromCurrentValueMap = Object.fromEntries(currentValue as Map<any, any>)

            if (recursiveSegment.IsKey && recursiveSegment.Key) {
                const valueFromObjectLiteral = objectFromCurrentValueMap[recursiveSegment.Key]

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        if (!IsNullOrUndefined(valueFromObjectLiteral)) {
                            return {
                                Result: valueFromObjectLiteral,
                                Ok: true
                            }
                        }
                        throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `value of ${currentDataKind} entry ${recursiveSegment.Key} not valid`, currentPath, currentValue)
                    }

                    const recursiveDescentIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(0)
                        .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                        .build()

                    return this.recursiveDescentGet(valueFromObjectLiteral, recursiveDescentIndexes, [...currentPath, recursiveSegment])
                }

                const recursiveIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                    .build()

                return this.recursiveGet(valueFromObjectLiteral, recursiveIndexes, [...currentPath, recursiveSegment])
            }

            if (recursiveSegment.IsKeyIndexAll || IsArrayAndNotEmpty(recursiveSegment.UnionSelector)) {
                let selectorArray: any[] = []

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const objectValue of Object.values(objectFromCurrentValueMap)) {
                        if (!IsNullOrUndefined(objectValue)) {
                            selectorArray.push(objectValue)
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
                        }
                    }
                }

                return this.selectorLoop(currentDataKind, selectorArray, recursiveSegment, currentValue, currentPathSegmentIndexes, currentPath)
            }

            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
        }

        if (IsArray(currentValue)) {
            const currentDataKind = DataKinds.Array

            if (recursiveSegment.IsIndex && typeof recursiveSegment.Index == 'number') {
                if (recursiveSegment.Index >= currentValue.length) {
                    throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `in ${currentDataKind}, index ${CollectionMemberSegmentToString(recursiveSegment)} out of range`, currentPath, currentValue)
                }

                const valueFromArray = currentValue[recursiveSegment.Index]

                if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                        if (!IsNullOrUndefined(valueFromArray)) {
                            return {
                                Result: valueFromArray,
                                Ok: true
                            }
                        }
                        throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `value in ${currentDataKind} at index ${recursiveSegment.Index} not valid`, currentPath, currentValue)
                    }

                    const recursiveDescentIndexes = PathSegmentsIndexes.create()
                        .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                        .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                        .WithCurrentCollection(0)
                        .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                        .build()

                    return this.recursiveDescentGet(valueFromArray, recursiveDescentIndexes, [...currentPath, recursiveSegment])
                }

                const recursiveIndexes = PathSegmentsIndexes.create()
                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                    .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                    .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                    .build()

                return this.recursiveGet(valueFromArray, recursiveIndexes, [...currentPath, recursiveSegment])
            }

            if (recursiveSegment.IsKeyIndexAll || IsArrayAndNotEmpty(recursiveSegment.UnionSelector) || IsObjectLiteralAndNotEmpty(recursiveSegment.LinearCollectionSelector)) {
                let selectorArray: any[] = []

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const arrayElement of currentValue) {
                        if (!IsNullOrUndefined(arrayElement)) {
                            selectorArray.push(arrayElement)
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
                        }
                    }
                } else {
                    let start = 0
                    if (recursiveSegment.LinearCollectionSelector!.IsStart && typeof recursiveSegment.LinearCollectionSelector!.Start === 'number') {
                        if (recursiveSegment.LinearCollectionSelector!.Start >= currentValue.length) {
                            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, linear collection selector ${CollectionMemberSegmentToString(recursiveSegment)} Start is out of range`, currentPath, currentValue)
                        }
                        start = recursiveSegment.LinearCollectionSelector!.Start
                    }
                    let step = 1
                    if (recursiveSegment.LinearCollectionSelector!.IsStep && typeof recursiveSegment.LinearCollectionSelector!.Step === 'number') {
                        if (recursiveSegment.LinearCollectionSelector!.Step >= currentValue.length) {
                            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, linear collection selector ${CollectionMemberSegmentToString(recursiveSegment)} Step is out of range`, currentPath, currentValue)
                        }
                        step = recursiveSegment.LinearCollectionSelector!.Step
                    }
                    let end = currentValue.length
                    if (recursiveSegment.LinearCollectionSelector!.IsEnd && typeof recursiveSegment.LinearCollectionSelector!.End === 'number') {
                        if (recursiveSegment.LinearCollectionSelector!.End >= currentValue.length) {
                            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, linear collection selector ${CollectionMemberSegmentToString(recursiveSegment)} End is out of range`, currentPath, currentValue)
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
                        }
                    }
                }

                return this.selectorLoop(currentDataKind, selectorArray, recursiveSegment, currentValue, currentPathSegmentIndexes, currentPath)
            }

            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
        }

        if (IsSet(currentValue)) {
            const currentDataKind = DataKinds.Set

            if (recursiveSegment.IsKeyIndexAll) {
                let selectorArray: any[] = []

                for (const setEntry of currentValue as Set<any>) {
                    if (!IsNullOrUndefined(setEntry)) {
                        selectorArray.push(setEntry)
                    }
                }

                return this.selectorLoop(currentDataKind, selectorArray, recursiveSegment, currentValue, currentPathSegmentIndexes, currentPath)
            }

            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `in ${currentDataKind}, unsupported recursive segment ${CollectionMemberSegmentToString(recursiveSegment)}`, currentPath, currentValue)
        }

        throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'unsupported value at recursive segment', currentPath, currentValue)
    }
    
    private selectorLoop(dataKind: DataKind, selectorArray: any, recursiveSegment: CollectionMemberSegment, currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): GetObjectResult {
        const FunctionName = 'selectorLoop'
        
        if (selectorArray.length === 0) {
            throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `in ${dataKind}, selector ${CollectionMemberSegmentToString(recursiveSegment)} yielded no results`, currentPath, currentValue)
        }

        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
            if (currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive) {
                return {
                    Result: selectorArray,
                    Ok: true
                }
            }

            const recursiveDescentIndexes = PathSegmentsIndexes.create()
                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                .WithCurrentCollection(0)
                .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                .build()

            return this.recursiveDescentGet(selectorArray, recursiveDescentIndexes, [...currentPath, recursiveSegment])
        }

        const recursiveIndexes = PathSegmentsIndexes.create()
            .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
            .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
            .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
            .WithLastCollection(currentPathSegmentIndexes.LastCollection)
            .build()

        let newArrayResult: any[] = []
        for (const selectorArrayElement of selectorArray) {
            try {
                const v = this.recursiveGet(selectorArrayElement, recursiveIndexes, [...currentPath, recursiveSegment])
                if (v && v.Ok) {
                    newArrayResult = this.flattenNewArrayResult(newArrayResult, currentPathSegmentIndexes, v.Result)
                }
            } catch (e) {
            }
        }

        if (newArrayResult.length === 0) {
            throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `in ${dataKind}, recursively working with selector ${CollectionMemberSegmentToString(recursiveSegment)} results yielded no ok results`, currentPath, currentValue)
        }

        return {
            Result: newArrayResult,
            Ok: true
        }
    }

    /**
     * Convert nested array result {@link v} from {@link recursiveGet} into a single 1D array if the next path segment contains {@link IsKeyIndexAll}, {@link CollectionMemberSegment.UnionSelector}, or {@link CollectionMemberSegment.LinearCollectionSelector}.
     * */
    private flattenNewArrayResult(newArrayResult: any[], indexes: PathSegmentsIndexes, v: any): any[] {
        if (indexes.CurrentCollection < indexes.LastCollection) {
            if (IsArray(v)) {
                if (this._recursiveDescentSegments[indexes.CurrentRecursive][indexes.CurrentCollection + 1].IsKeyIndexAll || IsArrayAndNotEmpty(this._recursiveDescentSegments[indexes.CurrentRecursive][indexes.CurrentCollection + 1].UnionSelector) || IsObjectLiteral(this._recursiveDescentSegments[indexes.CurrentRecursive][indexes.CurrentCollection + 1].LinearCollectionSelector)) {
                    return [...newArrayResult, ...v]
                }
            }
        }

        newArrayResult.push(v)
        return newArrayResult
    }

    private recursiveDescentGet(currentValue: any, currentPathSegmentIndexes: PathSegmentsIndexes, currentPath: RecursiveDescentSegment): GetObjectResult {
        const FunctionName = 'recursiveDescentGet'

        let valueFound: any[] = []

        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive || currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'currentPathSegmentIndexes exhausted', currentPath, currentValue)
        }

        const recursiveDescentSearchSegment = this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][currentPathSegmentIndexes.CurrentCollection]
        if (!IsObjectLiteral(recursiveDescentSearchSegment)) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'recursive descent search segment is empty', currentPath, currentValue)
        }

        if (IsNullOrUndefined(currentValue)) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, 'current value null or undefined', currentPath, currentValue)
        }

        if (recursiveDescentSearchSegment.IsKeyRoot) {
            return this.recursiveGet(currentValue, currentPathSegmentIndexes, [...currentPath, recursiveDescentSearchSegment])
        }

        if (!recursiveDescentSearchSegment.IsKey) {
            throw new ObjectError(ObjectErrorCodes.PathSegmentInvalid, FunctionName, `recursive descent search segment ${CollectionMemberSegmentToString(recursiveDescentSearchSegment)} is not key`, currentPath, currentValue)
        }

        if (IsArray(currentValue)) {
            for (let i = 0; i < currentValue.length; i++) {
                const valueFromArray = currentValue[i]
                if (IsNullOrUndefined(valueFromArray)) {
                    continue
                }

                try {
                    const recursiveDescentValue = this.recursiveDescentGet(valueFromArray, currentPathSegmentIndexes, [...currentPath, {
                        Index: i,
                        IsIndex: true
                    }])
                    if (recursiveDescentValue && recursiveDescentValue.Ok) {
                        if (IsArray(recursiveDescentValue.Result)) {
                            valueFound = [...valueFound, ...recursiveDescentValue.Result]
                        } else {
                            valueFound.push(recursiveDescentValue.Result)
                        }
                    }
                } catch (e) {
                }
            }
        } else if (IsSet(currentValue)) {
            let i = 0
            for (const setEntry of currentValue as Set<any>) {
                if (IsNullOrUndefined(setEntry)) {
                    continue
                }

                try {
                    const recursiveDescentValue = this.recursiveDescentGet(setEntry, currentPathSegmentIndexes, [...currentPath, {
                        Index: i,
                        IsIndex: true
                    }])
                    if (recursiveDescentValue && recursiveDescentValue.Ok) {
                        if (IsArray(recursiveDescentValue.Result)) {
                            valueFound = [...valueFound, ...recursiveDescentValue.Result]
                        } else {
                            valueFound.push(recursiveDescentValue.Result)
                        }
                    }
                } catch (e) {
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
                            valueFound.push(objectValue)
                        } else {
                            try {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                const recursiveDescentValue = this.recursiveDescentGet(objectValue, recursiveDescentIndexes, nextPathSegments)
                                if (recursiveDescentValue && recursiveDescentValue.Ok) {
                                    if (IsArray(recursiveDescentValue.Result)) {
                                        valueFound = [...valueFound, ...recursiveDescentValue.Result]
                                    } else {
                                        valueFound.push(recursiveDescentValue.Result)
                                    }
                                }
                            } catch (e) {
                            }
                        }
                    } else {
                        try {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            const recursiveValue = this.recursiveGet(objectValue, recursiveIndexes, nextPathSegments)
                            if (recursiveValue && recursiveValue.Ok) {
                                if (IsArray(recursiveValue.Result)) {
                                    valueFound = [...valueFound, ...recursiveValue.Result]
                                } else {
                                    valueFound.push(recursiveValue.Result)
                                }
                            }
                        } catch (e) {
                        }
                    }
                }

                try {
                    const recursiveDescentValue = this.recursiveDescentGet(objectValue, currentPathSegmentIndexes, nextPathSegments)
                    if (recursiveDescentValue && recursiveDescentValue.Ok) {
                        if (IsArray(recursiveDescentValue.Result)) {
                            valueFound = [...valueFound, ...recursiveDescentValue.Result]
                        } else {
                            valueFound.push(recursiveDescentValue.Result)
                        }
                    }
                } catch (e) {
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
                            valueFound.push(objectValue)
                        } else {
                            try {
                                const recursiveDescentIndexes = PathSegmentsIndexes.create()
                                    .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive + 1)
                                    .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                    .WithCurrentCollection(0)
                                    .WithLastCollection(this._recursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1].length - 1)
                                    .build()

                                const recursiveDescentValue = this.recursiveDescentGet(objectValue, recursiveDescentIndexes, nextPathSegments)
                                if (recursiveDescentValue && recursiveDescentValue.Ok) {
                                    if (IsArray(recursiveDescentValue.Result)) {
                                        valueFound = [...valueFound, ...recursiveDescentValue.Result]
                                    } else {
                                        valueFound.push(recursiveDescentValue.Result)
                                    }
                                }
                            } catch (e) {
                            }
                        }
                    } else {
                        try {
                            const recursiveIndexes = PathSegmentsIndexes.create()
                                .WithCurrentRecursive(currentPathSegmentIndexes.CurrentRecursive)
                                .WithLastRecursive(currentPathSegmentIndexes.LastRecursive)
                                .WithCurrentCollection(currentPathSegmentIndexes.CurrentCollection + 1)
                                .WithLastCollection(currentPathSegmentIndexes.LastCollection)
                                .build()

                            const recursiveValue = this.recursiveGet(objectValue, recursiveIndexes, nextPathSegments)
                            if (recursiveValue && recursiveValue.Ok) {
                                if (IsArray(recursiveValue.Result)) {
                                    valueFound = [...valueFound, ...recursiveValue.Result]
                                } else {
                                    valueFound.push(recursiveValue.Result)
                                }
                            }
                        } catch (e) {
                        }
                    }
                }

                try {
                    const recursiveDescentValue = this.recursiveDescentGet(objectValue, currentPathSegmentIndexes, nextPathSegments)
                    if (recursiveDescentValue && recursiveDescentValue.Ok) {
                        if (IsArray(recursiveDescentValue.Result)) {
                            valueFound = [...valueFound, ...recursiveDescentValue.Result]
                        } else {
                            valueFound.push(recursiveDescentValue.Result)
                        }
                    }
                } catch (e) {
                }
            }
        } else {
            throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `unsupported value at recursive descent search segment ${CollectionMemberSegmentToString(recursiveDescentSearchSegment)}`, currentPath, currentValue)
        }

        if (valueFound.length === 0) {
            throw new ObjectError(ObjectErrorCodes.ValueAtPathSegmentInvalid, FunctionName, `no search value found at recursive descent search segment ${CollectionMemberSegmentToString(recursiveDescentSearchSegment)}`, currentPath, currentValue)
        }

        return {
            Result: valueFound,
            Ok: true
        }
    }
}