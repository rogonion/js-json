import { CollectionMemberSegment, Parse, type JSONPath, type RecursiveDescentSegment } from '@path';
import type { JSObject } from './object';
import { PathSegmentsIndexes } from '@internal';
import { IsArray, IsDefined, IsMap, IsNumber, IsObject, IsSet, IsString, JsonError, JSONstringify } from '@core';
import { JSObjectErrorCodes } from './core';
import { DataKind } from '@schema';

/**
 * Removes value(s) in {@link JSObject.Source} at {@link JSONPath}.
 */
export class JSObjectDelete {
    private _object: JSObject;

    constructor(object: JSObject) {
        this._object = object;
    }

    public Delete(jsonPath: JSONPath): number {
        if (jsonPath === '$' || jsonPath === '') {
            this._object.Source = undefined;
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
            result = this.recursiveDelete(this._object.Source, currentPathSegmentIndexes, []);
        } else {
            result = this.recursiveDescentDelete(this._object.Source, currentPathSegmentIndexes, []);
        }

        this._object.Source = result;
        return this._object.NoOfResults || 0;
    }

    private recursiveDelete(
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
            return currentValue;
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return undefined;
                }

                const recursiveDescentIndexes = new PathSegmentsIndexes();
                recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveDescentIndexes.CurrentCollection = 0;
                recursiveDescentIndexes.LastCollection =
                    (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                        .length - 1;

                return this.recursiveDescentDelete(currentValue, recursiveDescentIndexes, currentPath);
            }

            const recursiveIndexes = new PathSegmentsIndexes();
            recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
            recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
            recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
            recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
            return this.recursiveDelete(currentValue, recursiveIndexes, currentPath);
        }

        if (IsMap(currentValue)) {
            const dataKind = DataKind.Map;

            if (IsDefined(recursiveSegment.Key) && !recursiveSegment.IsKeyIndexAll) {
                for (const [mapKey, mapValue] of currentValue as Map<any, any>) {
                    if (this.MapKeyString(mapKey) !== recursiveSegment.Key) continue;
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            if (IsDefined(mapValue)) {
                                currentValue.delete(mapKey);
                                this._object.NoOfResults += 1;
                            }
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

                            const recursiveDescentValue = this.recursiveDescentDelete(
                                mapValue,
                                recursiveDescentIndexes,
                                [...currentPath, recursiveSegment]
                            );
                            currentValue.set(mapKey, recursiveDescentValue);
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                        const recursiveValue = this.recursiveDelete(mapValue, recursiveIndexes, [
                            ...currentPath,
                            recursiveSegment
                        ]);
                        currentValue.set(mapKey, recursiveValue);
                    }
                    break;
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const [mapKey, mapValue] of currentValue as Map<any, any>) {
                    const pathSegment = new CollectionMemberSegment();
                    pathSegment.Key = this.MapKeyString(mapKey);
                    const nextPathSegments = [...currentPath, pathSegment];

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            if (IsDefined(mapValue)) {
                                currentValue.delete(mapKey);
                                this._object.NoOfResults += 1;
                            }
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

                            const recursiveDescentValue = this.recursiveDescentDelete(
                                mapValue,
                                recursiveDescentIndexes,
                                nextPathSegments
                            );
                            currentValue.set(mapKey, recursiveDescentValue);
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                        const recursiveValue = this.recursiveDelete(mapValue, recursiveIndexes, nextPathSegments);
                        currentValue.set(mapKey, recursiveValue);
                    }
                }
            } else if (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0) {
                let unionKeys: string[] = [];

                for (const unionKey of recursiveSegment.UnionSelector!) {
                    if (!IsString(unionKey.Key)) continue;
                    unionKeys.push(unionKey.Key);
                }

                for (const [mapKey, mapValue] of currentValue as Map<any, any>) {
                    if (!unionKeys.includes(this.MapKeyString(mapKey))) continue;

                    const pathSegment = new CollectionMemberSegment();
                    pathSegment.Key = this.MapKeyString(mapKey);
                    const nextPathSegments = [...currentPath, pathSegment];

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            if (IsDefined(mapValue)) {
                                currentValue.delete(mapKey);
                                this._object.NoOfResults += 1;
                            }
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

                            const recursiveDescentValue = this.recursiveDescentDelete(
                                mapValue,
                                recursiveDescentIndexes,
                                nextPathSegments
                            );
                            currentValue.set(mapKey, recursiveDescentValue);
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                        const recursiveValue = this.recursiveDelete(mapValue, recursiveIndexes, nextPathSegments);
                        currentValue.set(mapKey, recursiveValue);
                    }
                }
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

            return currentValue;
        } else if (IsArray(currentValue)) {
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
                    return currentValue;
                }

                const arrayValue = currentValue[recursiveSegment.Index];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (IsDefined(arrayValue)) {
                            currentValue = (currentValue as any[]).filter(
                                (_, index) => recursiveSegment.Index !== index
                            );
                            this._object.NoOfResults += 1;
                        }
                    } else {
                        const recursiveDescentIndexes = new PathSegmentsIndexes();
                        recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                        recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveDescentIndexes.CurrentCollection = 0;
                        recursiveDescentIndexes.LastCollection =
                            (
                                this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] ||
                                []
                            ).length - 1;

                        currentValue[recursiveSegment.Index] = this.recursiveDescentDelete(
                            arrayValue,
                            recursiveDescentIndexes,
                            [...currentPath, recursiveSegment]
                        );
                    }
                } else {
                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                    currentValue[recursiveSegment.Index] = this.recursiveDelete(arrayValue, recursiveIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                if (
                    currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection &&
                    currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive
                ) {
                    this._object.NoOfResults += currentValue.length;
                    currentValue = [];
                } else {
                    for (let i = 0; i < currentValue.length; i++) {
                        const pathSegment = new CollectionMemberSegment();
                        pathSegment.Index = i;
                        const nextPathSegments = [...currentPath, pathSegment];

                        const arrayValue = currentValue[i];

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
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

                            currentValue[pathSegment.Index!] = this.recursiveDescentDelete(
                                arrayValue,
                                recursiveDescentIndexes,
                                nextPathSegments
                            );
                            continue;
                        }

                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        currentValue[pathSegment.Index!] = this.recursiveDelete(
                            arrayValue,
                            recursiveIndexes,
                            nextPathSegments
                        );
                    }
                }
            } else if (recursiveSegment.UnionSelector) {
                if (
                    currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection &&
                    currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive
                ) {
                    let indexesToExclude: number[] = [];

                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!IsNumber(unionKey.Index)) continue;
                        if (unionKey.Index >= currentValue.length) continue;
                        indexesToExclude.push(unionKey.Index);
                    }

                    if (indexesToExclude.length > 0) {
                        currentValue = (currentValue as any[]).filter((_, index) => !indexesToExclude.includes(index));
                        this._object.NoOfResults += indexesToExclude.length;
                    }
                } else {
                    for (const unionKey of recursiveSegment.UnionSelector!) {
                        if (!IsNumber(unionKey.Index)) continue;
                        if (unionKey.Index >= currentValue.length) continue;

                        const nextPathSegments = [...currentPath, unionKey];

                        const arrayValue = currentValue[unionKey.Index];

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
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

                            currentValue[unionKey.Index!] = this.recursiveDescentDelete(
                                arrayValue,
                                recursiveDescentIndexes,
                                nextPathSegments
                            );
                            continue;
                        }

                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        currentValue[unionKey.Index!] = this.recursiveDelete(
                            arrayValue,
                            recursiveIndexes,
                            nextPathSegments
                        );
                    }
                }
            } else if (recursiveSegment.LinearCollectionSelector) {
                let start = 0;
                if (IsNumber(recursiveSegment.LinearCollectionSelector.Start)) {
                    start = recursiveSegment.LinearCollectionSelector!.Start;
                }
                let step = 1;
                if (IsNumber(recursiveSegment.LinearCollectionSelector.Step)) {
                    step = recursiveSegment.LinearCollectionSelector!.Step;
                }
                let end = currentValue.length;
                if (IsNumber(recursiveSegment.LinearCollectionSelector.End)) {
                    end = recursiveSegment.LinearCollectionSelector!.End;
                }

                if (
                    currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection &&
                    currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive
                ) {
                    let indexesToExclude: number[] = [];

                    for (let i = start; i < end; i += step) {
                        if (i >= currentValue.length) {
                            continue;
                        }
                        indexesToExclude.push(i);
                    }

                    if (indexesToExclude.length > 0) {
                        currentValue = (currentValue as any[]).filter((_, index) => !indexesToExclude.includes(index));
                        this._object.NoOfResults += indexesToExclude.length;
                    }
                } else {
                    for (let i = start; i < end; i += step) {
                        const pathSegment = new CollectionMemberSegment();
                        pathSegment.Index = i;
                        const nextPathSegments = [...currentPath, pathSegment];

                        const arrayValue = currentValue[i];

                        if (currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection) {
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

                            currentValue[pathSegment.Index!] = this.recursiveDescentDelete(
                                arrayValue,
                                recursiveDescentIndexes,
                                nextPathSegments
                            );
                            continue;
                        }

                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        currentValue[pathSegment.Index!] = this.recursiveDelete(
                            arrayValue,
                            recursiveIndexes,
                            nextPathSegments
                        );
                    }
                }
            } else {
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
            }
        } else if (IsSet(currentValue)) {
            currentValue = new Set(
                this.recursiveDelete(Array.from(currentValue), currentPathSegmentIndexes, currentPath)
            );
        } else if (IsObject(currentValue)) {
            const dataKind = DataKind.Object;

            if (IsDefined(recursiveSegment.Key) && !recursiveSegment.IsKeyIndexAll) {
                const pojoValue = (currentValue as any)[recursiveSegment.Key];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (IsDefined(pojoValue)) {
                            delete (currentValue as any)[recursiveSegment.Key];
                            this._object.NoOfResults += 1;
                        }
                    } else {
                        const recursiveDescentIndexes = new PathSegmentsIndexes();
                        recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                        recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveDescentIndexes.CurrentCollection = 0;
                        recursiveDescentIndexes.LastCollection =
                            (
                                this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] ||
                                []
                            ).length - 1;

                        (currentValue as any)[recursiveSegment.Key] = this.recursiveDescentDelete(
                            pojoValue,
                            recursiveDescentIndexes,
                            [...currentPath, recursiveSegment]
                        );
                    }
                } else {
                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                    (currentValue as any)[recursiveSegment.Key] = this.recursiveDelete(pojoValue, recursiveIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const pojoKey of Object.keys(currentValue)) {
                    const pojoValue = (currentValue as any)[pojoKey];

                    const pojoKeyPathSegment = new CollectionMemberSegment();
                    pojoKeyPathSegment.Key = String(pojoKey);

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            delete (currentValue as any)[pojoKey];
                            this._object.NoOfResults++;
                            continue;
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

                            (currentValue as any)[pojoKey] = this.recursiveDescentDelete(
                                pojoValue,
                                recursiveDescentIndexes,
                                [...currentPath, recursiveSegment]
                            );
                            continue;
                        }
                    }

                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                    (currentValue as any)[pojoKey] = this.recursiveDelete(pojoValue, recursiveIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }
            } else if (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0) {
                for (const unionKey of recursiveSegment.UnionSelector) {
                    if (!IsDefined(unionKey.Key)) continue;

                    const mapValue = (currentValue as any)[unionKey.Key];
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            delete (currentValue as any)[unionKey.Key];
                            this._object.NoOfResults++;
                            continue;
                        }

                        const recursiveDescentIndexes = new PathSegmentsIndexes();
                        recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                        recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveDescentIndexes.CurrentCollection = 0;
                        recursiveDescentIndexes.LastCollection =
                            (
                                this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] ||
                                []
                            ).length - 1;

                        (currentValue as any)[unionKey.Key] = this.recursiveDescentDelete(
                            mapValue,
                            recursiveDescentIndexes,
                            [...currentPath, recursiveSegment]
                        );
                        continue;
                    }

                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                    (currentValue as any)[unionKey.Key] = this.recursiveDelete(mapValue, recursiveIndexes, [
                        ...currentPath,
                        recursiveSegment
                    ]);
                }
            } else {
                this._object.LastError = Object.assign(
                    new JsonError(
                        `in pojo ${dataKind} unsupported recursive segment ${recursiveSegment.toString()}`,
                        undefined,
                        JSObjectErrorCodes.PathSegmentInvalid
                    ),
                    {
                        Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                    }
                );
            }
        } else {
            this._object.LastError = Object.assign(
                new JsonError(
                    `unsupported value at recursive segment ${recursiveSegment.toString()}`,
                    undefined,
                    JSObjectErrorCodes.PathSegmentInvalid
                ),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
        }

        return currentValue;
    }

    private recursiveDescentDelete(
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
            return currentValue;
        }

        if (!IsDefined(currentValue)) {
            this._object.LastError = Object.assign(
                new JsonError('current value is not defined', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                {
                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                }
            );
            return currentValue;
        }

        if (recursiveDescentSearchSegment.IsKeyRoot) {
            return this.recursiveDelete(currentValue, currentPathSegmentIndexes, currentPath);
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
            return currentValue;
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
                            currentValue.delete(mapKey);
                            this._object.NoOfResults++;
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

                            const recursiveDescentValue = this.recursiveDescentDelete(
                                mapValue,
                                recursiveDescentIndexes,
                                [...currentPath, keyPathSegment]
                            );
                            currentValue.set(mapKey, recursiveDescentValue);
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        const recursiveValue = this.recursiveDelete(mapValue, recursiveIndexes, [
                            ...currentPath,
                            keyPathSegment
                        ]);
                        currentValue.set(mapKey, recursiveValue);
                    }
                } else {
                    const recursiveDescentValue = this.recursiveDescentDelete(mapValue, currentPathSegmentIndexes, [
                        ...currentPath,
                        keyPathSegment
                    ]);
                    currentValue.set(mapKey, recursiveDescentValue);
                }
            }
        } else if (IsArray(currentValue)) {
            for (let i = 0; i < currentValue.length; i++) {
                const arrayValue = currentValue[i];
                if (!IsDefined(arrayValue)) continue;

                const arrayIndexPathSegment = new CollectionMemberSegment();
                arrayIndexPathSegment.Index = i;

                currentValue[i] = this.recursiveDescentDelete(arrayValue, currentPathSegmentIndexes, [
                    ...currentPath,
                    arrayIndexPathSegment
                ]);
            }
        } else if (IsSet(currentValue)) {
            const arrayFromSet = Array.from<any>(currentValue);
            for (let i = 0; i < arrayFromSet.length; i++) {
                const arrayValue = arrayFromSet[i];
                if (!IsDefined(arrayValue)) continue;
                const arrayIndexPathSegment = new CollectionMemberSegment();
                arrayIndexPathSegment.Index = i;

                arrayFromSet[i] = this.recursiveDescentDelete(arrayValue, currentPathSegmentIndexes, [
                    ...currentPath,
                    arrayIndexPathSegment
                ]);
            }
            currentValue = new Set(arrayFromSet);
        } else if (IsObject(currentValue)) {
            for (const pojoKey of Object.keys(currentValue)) {
                const keyPathSegment = new CollectionMemberSegment();
                keyPathSegment.Key = String(pojoKey);

                const pojoValue = (currentValue as any)[pojoKey];

                if (!IsDefined(pojoValue)) continue;

                if (keyPathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            delete (currentValue as any)[pojoKey];
                            this._object.NoOfResults++;
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

                            (currentValue as any)[pojoKey] = this.recursiveDescentDelete(
                                pojoValue,
                                recursiveDescentIndexes,
                                [...currentPath, keyPathSegment]
                            );
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        (currentValue as any)[pojoKey] = this.recursiveDelete(pojoValue, recursiveIndexes, [
                            ...currentPath,
                            keyPathSegment
                        ]);
                    }
                } else {
                    (currentValue as any)[pojoKey] = this.recursiveDescentDelete(pojoValue, currentPathSegmentIndexes, [
                        ...currentPath,
                        keyPathSegment
                    ]);
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

        return currentValue;
    }

    private MapKeyString(mapKey: any): string {
        if (typeof mapKey === 'string') {
            return mapKey;
        }
        return JSONstringify(mapKey);
    }
}
