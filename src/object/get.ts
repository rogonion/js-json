import { Parse, CollectionMemberSegment, type JSONPath, type RecursiveDescentSegment } from '@path';
import type { JSObject } from './object';
import { PathSegmentsIndexes } from '@internal';
import { DataKind } from '@schema';
import { IsArray, IsDefined, IsMap, IsNumber, IsObject, IsSet, IsString, JsonError } from '@core';
import { JSObjectErrorCodes } from './core';

/**
 * Retrieves value(s) in {@link JSObject.Source} at {@link JSONPath}.
 *
 * For {@link JSONPath} patterns like recursive descent pattern (`$..One`), wildcard (`$.One[*]`), or union selector (`$.['One','Two','Three']`) expect an array of values found.
 *
 */
export class JSObjectGet {
    private _object: JSObject;

    constructor(object: JSObject) {
        this._object = object;
    }

    public Get(jsonPath: JSONPath): number {
        if (jsonPath === '$' || jsonPath === '') {
            this._object.ValueFound = this._object.Source;
            this._object.NoOfResults = 1;
            return 1;
        }

        this._object.RecursiveDescentSegments = Parse(jsonPath);
        this._object.NoOfResults = 0;
        this._object.LastError = undefined;

        const currentPathSegmentIndexes = new PathSegmentsIndexes();
        currentPathSegmentIndexes.CurrentRecursive = 0;
        currentPathSegmentIndexes.LastRecursive = this._object.RecursiveDescentSegments.length - 1;

        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive) {
            this._object.LastError = Object.assign(
                new JsonError('currentPathSegmentIndexes empty', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { Source: this._object.Source }
                }
            );
            return 0;
        }

        currentPathSegmentIndexes.CurrentCollection = 0;
        currentPathSegmentIndexes.LastCollection = (this._object.RecursiveDescentSegments[0] || []).length - 1;

        if (currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            this._object.LastError = Object.assign(
                new JsonError('currentPathSegmentIndexes empty', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { Source: this._object.Source }
                }
            );
            return 0;
        }

        let result: any;
        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
            result = this.recursiveGet(this._object.Source, currentPathSegmentIndexes, []);
        } else {
            result = this.recursiveDescentGet(this._object.Source, currentPathSegmentIndexes, []);
        }

        this._object.ValueFound = result;
        return this._object.NoOfResults || 0;
    }

    private recursiveGet(
        currentValue: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment
    ): any {
        if (
            currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive ||
            currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection
        ) {
            this._object.LastError = Object.assign(
                new JsonError('indexes empty', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return currentValue;
        }

        const recursiveSegment =
            this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][
                currentPathSegmentIndexes.CurrentCollection
            ];
        if (!IsDefined(recursiveSegment)) {
            this._object.LastError = Object.assign(
                new JsonError('recursiveSegment is not defined', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return currentValue;
        }

        if (!IsDefined(currentValue)) {
            this._object.LastError = Object.assign(
                new JsonError('currentValue is not defined', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    this._object.NoOfResults += 1;
                    return currentValue;
                }

                const recursiveDescentIndexes = new PathSegmentsIndexes();
                recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveDescentIndexes.CurrentCollection = 0;
                recursiveDescentIndexes.LastCollection =
                    (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                        .length - 1;

                return this.recursiveDescentGet(currentValue, recursiveDescentIndexes, currentPath);
            }

            const recursiveIndexes = new PathSegmentsIndexes();
            recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
            recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
            recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
            recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
            return this.recursiveGet(currentValue, recursiveIndexes, currentPath);
        }

        if (IsMap(currentValue)) {
            const dataKind = DataKind.Map;
            const objectFromCurrentValueMap = Object.fromEntries(currentValue as Map<any, any>);

            if (IsDefined(recursiveSegment.Key) && !recursiveSegment.IsKeyIndexAll) {
                const mapValue = objectFromCurrentValueMap[recursiveSegment.Key];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (IsDefined(mapValue)) {
                            this._object.NoOfResults += 1;
                            return mapValue;
                        }
                        this._object.LastError = Object.assign(
                            new JsonError(
                                `value of map entry not defined`,
                                undefined,
                                JSObjectErrorCodes.PathSegmentInvalid
                            ),
                            {
                                Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                            }
                        );
                        return undefined;
                    }

                    const recursiveDescentIndexes = new PathSegmentsIndexes();
                    recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                    recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveDescentIndexes.CurrentCollection = 0;
                    recursiveDescentIndexes.LastCollection =
                        (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                            .length - 1;

                    return this.recursiveDescentGet(mapValue, recursiveDescentIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }

                const recursiveIndexes = new PathSegmentsIndexes();
                recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                return this.recursiveGet(mapValue, recursiveIndexes, [...currentPath, recursiveSegment]);
            }

            if (
                recursiveSegment.IsKeyIndexAll ||
                (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0)
            ) {
                let selectorSlice: any[] = [];

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const keys of Object.keys(objectFromCurrentValueMap)) {
                        const mapValue = objectFromCurrentValueMap[keys];
                        if (IsDefined(mapValue)) {
                            selectorSlice.push(mapValue);
                        }
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!IsString(unionKey.Key)) continue;
                        const mapValue = objectFromCurrentValueMap[unionKey.Key];
                        if (IsDefined(mapValue)) {
                            selectorSlice.push(mapValue);
                        }
                    }
                }

                return this.selectorGetLoop(
                    dataKind,
                    selectorSlice,
                    recursiveSegment,
                    currentValue,
                    currentPathSegmentIndexes,
                    currentPath
                );
            }

            this._object.LastError = Object.assign(
                new JsonError(
                    `in ${dataKind} unsupported recursive segment ${recursiveSegment.toString()}`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );

            return undefined;
        }

        if (IsArray(currentValue)) {
            const dataKind = DataKind.Array;

            if (IsNumber(recursiveSegment.Index)) {
                if (recursiveSegment.Index >= currentValue.length) {
                    this._object.LastError = Object.assign(
                        new JsonError(
                            `in ${dataKind}, ${recursiveSegment.toString()} out of bounds`,
                            undefined,
                            JSObjectErrorCodes.PathSegmentInvalid
                        ),
                        {
                            Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                        }
                    );
                    return undefined;
                }

                const arrayValue = currentValue[recursiveSegment.Index];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (IsDefined(arrayValue)) {
                            this._object.NoOfResults += 1;
                            return arrayValue;
                        }
                        this._object.LastError = Object.assign(
                            new JsonError(
                                `value of array entry not defined`,
                                undefined,
                                JSObjectErrorCodes.PathSegmentInvalid
                            ),
                            {
                                Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                            }
                        );
                        return undefined;
                    }

                    const recursiveDescentIndexes = new PathSegmentsIndexes();
                    recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                    recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveDescentIndexes.CurrentCollection = 0;
                    recursiveDescentIndexes.LastCollection =
                        (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                            .length - 1;

                    return this.recursiveDescentGet(arrayValue, recursiveDescentIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }

                const recursiveIndexes = new PathSegmentsIndexes();
                recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                return this.recursiveGet(arrayValue, recursiveIndexes, [...currentPath, recursiveSegment]);
            }

            if (
                recursiveSegment.IsKeyIndexAll ||
                (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0) ||
                recursiveSegment.LinearCollectionSelector
            ) {
                let selectorSlice: any[] = [];

                if (recursiveSegment.IsKeyIndexAll) {
                    for (let i = 0; i < currentValue.length; i++) {
                        const arrayValue = currentValue[i];
                        if (IsDefined(arrayValue)) {
                            selectorSlice.push(arrayValue);
                        }
                    }
                } else if (recursiveSegment.LinearCollectionSelector) {
                    let start = 0;
                    if (IsNumber(recursiveSegment.LinearCollectionSelector!.Start)) {
                        start = recursiveSegment.LinearCollectionSelector!.Start;
                    }
                    let step = 1;
                    if (IsNumber(recursiveSegment.LinearCollectionSelector!.Step)) {
                        step = recursiveSegment.LinearCollectionSelector!.Step;
                    }
                    let end = currentValue.length;
                    if (IsNumber(recursiveSegment.LinearCollectionSelector!.End)) {
                        end = recursiveSegment.LinearCollectionSelector!.End;
                    }

                    for (let i = start; i < end; i += step) {
                        if (i >= currentValue.length) continue;
                        const arrayValue = currentValue[i];
                        if (IsDefined(arrayValue)) {
                            selectorSlice.push(arrayValue);
                        }
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!IsNumber(unionKey.Index) || unionKey.Index >= currentValue.length) continue;
                        const arrayValue = currentValue[unionKey.Index];
                        if (IsDefined(arrayValue)) {
                            selectorSlice.push(arrayValue);
                        }
                    }
                }

                return this.selectorGetLoop(
                    dataKind,
                    selectorSlice,
                    recursiveSegment,
                    currentValue,
                    currentPathSegmentIndexes,
                    currentPath
                );
            }

            this._object.LastError = Object.assign(
                new JsonError(
                    `in ${dataKind} unsupported recursive segment ${recursiveSegment.toString()}`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );

            return undefined;
        }

        if (IsSet(currentValue)) {
            return this.recursiveGet(Array.from(currentValue), currentPathSegmentIndexes, currentPath);
        }

        // if (IsSet(currentValue)) {
        //     const dataKind = DataKind.Set;

        //     if (recursiveSegment.IsKeyIndexAll) {
        //         let selectorSlice: any[] = [];

        //         const arrayFromSet = Array.from<any>(currentValue)
        //         for (let i = 0; i < arrayFromSet.length; i++) {
        //             const setValue = arrayFromSet[i];
        //             if (IsDefined(setValue)) {
        //                 selectorSlice.push(setValue);
        //             }
        //         }

        //         return this.selectorGetLoop(dataKind, selectorSlice, recursiveSegment, currentValue, currentPathSegmentIndexes, currentPath)
        //     }

        //     this._object.LastError = Object.assign(new JsonError(`in ${dataKind} unsupported recursive segment ${recursiveSegment.toString()}`, undefined, JSObjectErrorCodes.PathSegmentInvalid), {
        //         Data: {"CurrentValue": currentValue, "CurrentPathSegment": currentPath}
        //     })

        //     return undefined;
        // }

        if (IsObject(currentValue)) {
            const dataKind = DataKind.Object;

            if (IsDefined(recursiveSegment.Key) && !recursiveSegment.IsKeyIndexAll) {
                const pojoValue = (currentValue as any)[recursiveSegment.Key];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (IsDefined(pojoValue)) {
                            this._object.NoOfResults += 1;
                            return pojoValue;
                        }
                        this._object.LastError = Object.assign(
                            new JsonError(
                                `value of pojo entry not defined`,
                                undefined,
                                JSObjectErrorCodes.PathSegmentInvalid
                            ),
                            {
                                Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                            }
                        );
                        return undefined;
                    }

                    const recursiveDescentIndexes = new PathSegmentsIndexes();
                    recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                    recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveDescentIndexes.CurrentCollection = 0;
                    recursiveDescentIndexes.LastCollection =
                        (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                            .length - 1;

                    return this.recursiveDescentGet(pojoValue, recursiveDescentIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }

                const recursiveIndexes = new PathSegmentsIndexes();
                recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                return this.recursiveGet(pojoValue, recursiveIndexes, [...currentPath, recursiveSegment]);
            }

            if (
                recursiveSegment.IsKeyIndexAll ||
                (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0)
            ) {
                let selectorSlice: any[] = [];

                if (recursiveSegment.IsKeyIndexAll) {
                    for (const keys of Object.keys(currentValue)) {
                        const pojoValue = (currentValue as any)[keys];
                        if (IsDefined(pojoValue)) {
                            selectorSlice.push(pojoValue);
                        }
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!IsString(unionKey.Key)) continue;
                        const pojoValue = (currentValue as any)[unionKey.Key];
                        if (IsDefined(pojoValue)) {
                            selectorSlice.push(pojoValue);
                        }
                    }
                }

                return this.selectorGetLoop(
                    dataKind,
                    selectorSlice,
                    recursiveSegment,
                    currentValue,
                    currentPathSegmentIndexes,
                    currentPath
                );
            }

            this._object.LastError = Object.assign(
                new JsonError(
                    `in ${dataKind} unsupported recursive segment ${recursiveSegment.toString()}`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );

            return undefined;
        }

        return undefined;
    }

    private selectorGetLoop(
        dataKind: DataKind | string,
        selectorSlice: any,
        recursiveSegment: CollectionMemberSegment,
        currentValue: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment
    ): any {
        if (!Array.isArray(selectorSlice) || selectorSlice.length === 0) {
            this._object.LastError = Object.assign(
                new JsonError(
                    `in ${dataKind}, selector yielded no results`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
            if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                this._object.NoOfResults = selectorSlice.length;
                return selectorSlice;
            }

            const recursiveDescentIndexes = new PathSegmentsIndexes();
            recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
            recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
            recursiveDescentIndexes.CurrentCollection = 0;
            recursiveDescentIndexes.LastCollection =
                (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || []).length -
                1;

            return this.recursiveDescentGet(selectorSlice, recursiveDescentIndexes, [...currentPath, recursiveSegment]);
        }

        const recursiveIndexes = new PathSegmentsIndexes();
        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

        let newSliceResult: any[] = [];
        for (let i = 0; i < selectorSlice.length; i++) {
            const v = this.recursiveGet(selectorSlice[i], recursiveIndexes, [...currentPath, recursiveSegment]);
            if (v !== undefined) {
                newSliceResult = this.flattenNewSliceResult(newSliceResult, currentPathSegmentIndexes, v);
            }
        }

        if (newSliceResult.length === 0) {
            this._object.LastError = Object.assign(
                new JsonError(
                    `in ${dataKind}, recursively working with selector ${recursiveSegment.toString()} yielded no results`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        this._object.NoOfResults = newSliceResult.length;
        return newSliceResult;
    }

    private recursiveDescentGet(
        currentValue: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment
    ): any {
        let valueFound: any[] = [];

        if (
            currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive ||
            currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection
        ) {
            this._object.LastError = Object.assign(
                new JsonError('indexes empty', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        const recursiveDescentSearchSegment =
            this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][
                currentPathSegmentIndexes.CurrentCollection
            ];
        if (!recursiveDescentSearchSegment) {
            this._object.LastError = Object.assign(
                new JsonError(
                    'recursive descent search segment is not defined',
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        if (!IsDefined(currentValue)) {
            this._object.LastError = Object.assign(
                new JsonError('current value is not defined', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        if (recursiveDescentSearchSegment.IsKeyRoot) {
            return this.recursiveGet(currentValue, currentPathSegmentIndexes, currentPath);
        }

        if (!IsString(recursiveDescentSearchSegment.Key)) {
            this._object.LastError = Object.assign(
                new JsonError(
                    `recursive descent search segment ${recursiveDescentSearchSegment.toString()} is not a string`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return undefined;
        }

        if (IsMap(currentValue)) {
            for (const mapKey of Array.from(currentValue.keys())) {
                const keyPathSegment = new CollectionMemberSegment();
                keyPathSegment.Key = String(mapKey);

                const mapValue = currentValue.get(mapKey);

                if (!IsDefined(mapValue)) continue;

                if (keyPathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            valueFound.push(mapValue);
                        } else {
                            const recursiveDescentIndexes = new PathSegmentsIndexes();
                            recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                            recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                            recursiveDescentIndexes.CurrentCollection = 0;
                            recursiveDescentIndexes.LastCollection =
                                (
                                    this._object.RecursiveDescentSegments[
                                        currentPathSegmentIndexes.CurrentRecursive + 1
                                    ] || []
                                ).length - 1;

                            const recursiveDescentValue = this.recursiveDescentGet(mapValue, recursiveDescentIndexes, [
                                ...currentPath,
                                keyPathSegment
                            ]);
                            if (IsArray(recursiveDescentValue) && recursiveDescentValue.length > 0) {
                                valueFound.push(...recursiveDescentValue);
                            } else {
                                this._object.NoOfResults = valueFound.length;
                                return valueFound;
                            }
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        const recursiveValue = this.recursiveGet(mapValue, recursiveIndexes, [
                            ...currentPath,
                            keyPathSegment
                        ]);
                        if (IsArray(recursiveValue) && recursiveValue.length > 0) {
                            valueFound.push(...recursiveValue);
                        } else {
                            this._object.NoOfResults = valueFound.length;
                            return valueFound;
                        }
                    }
                }

                const recursiveDescentValue = this.recursiveDescentGet(mapValue, currentPathSegmentIndexes, [
                    ...currentPath,
                    keyPathSegment
                ]);
                if (IsArray(recursiveDescentValue) && recursiveDescentValue.length > 0) {
                    valueFound.push(...recursiveDescentValue);
                }
            }
        } else if (IsArray(currentValue)) {
            for (let i = 0; i < currentValue.length; i++) {
                const arrayValue = currentValue[i];
                if (!IsDefined(arrayValue)) continue;

                const arrayIndexPathSegment = new CollectionMemberSegment();
                arrayIndexPathSegment.Index = i;

                const recursiveDescentValue = this.recursiveDescentGet(arrayValue, currentPathSegmentIndexes, [
                    ...currentPath,
                    arrayIndexPathSegment
                ]);
                if (IsArray(recursiveDescentValue) && recursiveDescentValue.length > 0) {
                    valueFound.push(...recursiveDescentValue);
                }
            }
        } else if (IsSet(currentValue)) {
            const arrayFromSet = Array.from<any>(currentValue);
            for (let i = 0; i < arrayFromSet.length; i++) {
                const arrayValue = arrayFromSet[i];
                if (!IsDefined(arrayValue)) continue;
                const arrayIndexPathSegment = new CollectionMemberSegment();
                arrayIndexPathSegment.Index = i;

                const recursiveDescentValue = this.recursiveDescentGet(arrayValue, currentPathSegmentIndexes, [
                    ...currentPath,
                    arrayIndexPathSegment
                ]);
                if (IsArray(recursiveDescentValue) && recursiveDescentValue.length > 0) {
                    valueFound.push(...recursiveDescentValue);
                }
            }
        } else if (IsObject(currentValue)) {
            for (const pojoKey of Object.keys(currentValue)) {
                const keyPathSegment = new CollectionMemberSegment();
                keyPathSegment.Key = String(pojoKey);

                const pojoValue = (currentValue as any)[pojoKey];

                if (!IsDefined(pojoValue)) continue;

                if (keyPathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            valueFound.push(pojoValue);
                        } else {
                            const recursiveDescentIndexes = new PathSegmentsIndexes();
                            recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                            recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                            recursiveDescentIndexes.CurrentCollection = 0;
                            recursiveDescentIndexes.LastCollection =
                                (
                                    this._object.RecursiveDescentSegments[
                                        currentPathSegmentIndexes.CurrentRecursive + 1
                                    ] || []
                                ).length - 1;

                            const recursiveDescentValue = this.recursiveDescentGet(pojoValue, recursiveDescentIndexes, [
                                ...currentPath,
                                keyPathSegment
                            ]);
                            if (IsArray(recursiveDescentValue) && recursiveDescentValue.length > 0) {
                                valueFound.push(...recursiveDescentValue);
                            } else {
                                this._object.NoOfResults = valueFound.length;
                                return valueFound;
                            }
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        const recursiveValue = this.recursiveGet(pojoValue, recursiveIndexes, [
                            ...currentPath,
                            keyPathSegment
                        ]);
                        if (IsArray(recursiveValue) && recursiveValue.length > 0) {
                            valueFound.push(...recursiveValue);
                        } else {
                            this._object.NoOfResults = valueFound.length;
                            return valueFound;
                        }
                    }
                }

                const recursiveDescentValue = this.recursiveDescentGet(pojoValue, currentPathSegmentIndexes, [
                    ...currentPath,
                    keyPathSegment
                ]);
                if (IsArray(recursiveDescentValue) && recursiveDescentValue.length > 0) {
                    valueFound.push(...recursiveDescentValue);
                }
            }
        } else {
            this._object.LastError = Object.assign(
                new JsonError(
                    `unsuppored recursive descent search segment ${recursiveDescentSearchSegment.toString()}`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
        }

        if (valueFound.length === 0) return undefined;

        this._object.NoOfResults = valueFound.length;
        return valueFound;
    }

    private flattenNewSliceResult(newSliceResult: any, currentPathSegmentIndexes: PathSegmentsIndexes, v: any): any {
        if (currentPathSegmentIndexes.CurrentCollection < currentPathSegmentIndexes.LastCollection) {
            if (Array.isArray(v)) {
                const nextSegment =
                    this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][
                        currentPathSegmentIndexes.CurrentCollection + 1
                    ];
                if (
                    nextSegment &&
                    (nextSegment.IsKeyIndexAll ||
                        (nextSegment.UnionSelector && nextSegment.UnionSelector.length > 0) ||
                        nextSegment.LinearCollectionSelector)
                ) {
                    newSliceResult.push(...v);
                    return newSliceResult;
                }
            }
        }
        newSliceResult.push(v);
        return newSliceResult;
    }
}
