import { Parse, type JSONPath, type RecursiveDescentSegment, CollectionMemberSegment } from '@path';
import type { IfValueFoundInObject } from './core';
import type { JSObject } from './object';
import { PathSegmentsIndexes } from '@internal';
import { IsArray, IsDefined, IsMap, IsObject } from '@core';

/**
 * Loops through {@link JSObject._Source} using {@link JSONPath} as the guide then calls {@link IfValueFoundInObject} for each value found.
 *
 * Useful for the following JSONPath syntax:
 * * Recursive descent e.g, `$...One`
 * * Wildcard e.g., `$.One[*]`
 * * Union selector e.g., `$.['One','Two','Three']`
 * * Array selector e.g., `$.[1:6:2]`
 */
export class JSObjectForEach {
    private _object: JSObject;
    private _ifValueFoundInObject: IfValueFoundInObject;

    constructor(object: JSObject, ifValueFoundInObject: IfValueFoundInObject) {
        this._object = object;
        this._ifValueFoundInObject = ifValueFoundInObject;
    }

    public ForEach(jsonPath: JSONPath) {
        this._object.RecursiveDescentSegments = Parse(jsonPath);

        const currentPathSegmentIndexes = new PathSegmentsIndexes();
        currentPathSegmentIndexes.CurrentRecursive = 0;
        currentPathSegmentIndexes.LastRecursive = this._object.RecursiveDescentSegments.length - 1;
        if (currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive) {
            return;
        }

        currentPathSegmentIndexes.CurrentCollection = 0;
        currentPathSegmentIndexes.LastCollection = (this._object.RecursiveDescentSegments[0] || []).length - 1;
        if (currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection) {
            return;
        }

        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
            this.recursiveForEachValue(this._object.Source, currentPathSegmentIndexes, []);
        } else {
            this.recursiveDescentForEachValue(this._object.Source, currentPathSegmentIndexes, []);
        }
    }

    private recursiveForEachValue(
        currentValue: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment
    ): boolean {
        if (
            currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive ||
            currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection
        ) {
            return false;
        }

        if (!IsDefined(currentValue)) {
            return false;
        }

        const recursiveSegment =
            this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][
                currentPathSegmentIndexes.CurrentCollection
            ];

        if (!recursiveSegment) {
            return false;
        }

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return this._ifValueFoundInObject(currentPath, currentValue);
                }

                const recursiveDescentIndexes = new PathSegmentsIndexes();
                recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveDescentIndexes.CurrentCollection = 0;
                recursiveDescentIndexes.LastCollection =
                    (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                        .length - 1;

                return this.recursiveDescentForEachValue(currentValue, recursiveDescentIndexes, currentPath);
            }

            const recursiveIndexes = new PathSegmentsIndexes();
            recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
            recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
            recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
            recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
            return this.recursiveForEachValue(currentValue, recursiveIndexes, currentPath);
        }

        const isMap = IsMap(currentValue);
        const isObject = IsObject(currentValue) && !IsArray(currentValue) && !isMap;

        if (isMap || isObject) {
            if (recursiveSegment.Key !== undefined && !recursiveSegment.IsKeyIndexAll && !recursiveSegment.IsKeyRoot) {
                let mapValue: any;
                if (isMap) {
                    mapValue = currentValue.get(recursiveSegment.Key);
                } else {
                    mapValue = (currentValue as any)[recursiveSegment.Key];
                }

                const nextPath = [...currentPath, recursiveSegment];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (mapValue !== undefined) {
                            return this._ifValueFoundInObject(nextPath, mapValue);
                        }
                        return false;
                    }

                    const recursiveDescentIndexes = new PathSegmentsIndexes();
                    recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                    recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveDescentIndexes.CurrentCollection = 0;
                    recursiveDescentIndexes.LastCollection =
                        (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                            .length - 1;

                    return this.recursiveDescentForEachValue(mapValue, recursiveDescentIndexes, nextPath);
                }

                const recursiveIndexes = new PathSegmentsIndexes();
                recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                return this.recursiveForEachValue(mapValue, recursiveIndexes, nextPath);
            }

            if (
                recursiveSegment.IsKeyIndexAll ||
                (recursiveSegment.UnionSelector && recursiveSegment.UnionSelector.length > 0)
            ) {
                const selectorSlice: any[] = [];
                const selectorSliceElementPaths: RecursiveDescentSegment = [];

                if (recursiveSegment.IsKeyIndexAll) {
                    const keys = isMap ? Array.from(currentValue.keys()) : Object.keys(currentValue);
                    for (const key of keys) {
                        const val = isMap ? currentValue.get(key) : (currentValue as any)[key];
                        if (val !== undefined) {
                            selectorSlice.push(val);
                            const seg = new CollectionMemberSegment();
                            seg.Key = String(key);
                            selectorSliceElementPaths.push(seg);
                        }
                    }
                } else if (recursiveSegment.UnionSelector) {
                    for (const unionKey of recursiveSegment.UnionSelector) {
                        if (unionKey.Key === undefined) continue;

                        let val: any;
                        if (isMap) {
                            val = currentValue.get(unionKey.Key);
                        } else {
                            val = (currentValue as any)[unionKey.Key];
                        }

                        if (val !== undefined) {
                            selectorSlice.push(val);
                            selectorSliceElementPaths.push(unionKey);
                        }
                    }
                }

                return this.selectorForEachLoop(
                    selectorSlice,
                    selectorSliceElementPaths,
                    currentPathSegmentIndexes,
                    currentPath
                );
            }
        }

        if (IsArray(currentValue)) {
            if (recursiveSegment.Index !== undefined) {
                if (recursiveSegment.Index >= currentValue.length) return false;

                const val = currentValue[recursiveSegment.Index];
                const nextPath = [...currentPath, recursiveSegment];

                if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                    if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                        if (val !== undefined) {
                            if (this._ifValueFoundInObject(nextPath, val)) return true;
                        }
                        return false;
                    }

                    const recursiveDescentIndexes = new PathSegmentsIndexes();
                    recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                    recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveDescentIndexes.CurrentCollection = 0;
                    recursiveDescentIndexes.LastCollection =
                        (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                            .length - 1;
                    return this.recursiveDescentForEachValue(val, recursiveDescentIndexes, nextPath);
                }

                const recursiveIndexes = new PathSegmentsIndexes();
                recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                return this.recursiveForEachValue(val, recursiveIndexes, nextPath);
            }

            if (
                recursiveSegment.IsKeyIndexAll ||
                (recursiveSegment.UnionSelector && recursiveSegment.UnionSelector.length > 0) ||
                recursiveSegment.LinearCollectionSelector
            ) {
                const selectorSlice: any[] = [];
                const selectorSliceElementPaths: RecursiveDescentSegment = [];

                if (recursiveSegment.IsKeyIndexAll) {
                    for (let i = 0; i < currentValue.length; i++) {
                        const val = currentValue[i];
                        if (val !== undefined) {
                            selectorSlice.push(val);
                            const seg = new CollectionMemberSegment();
                            seg.Index = i;
                            selectorSliceElementPaths.push(seg);
                        }
                    }
                } else if (recursiveSegment.UnionSelector) {
                    for (const unionKey of recursiveSegment.UnionSelector) {
                        if (unionKey.Index === undefined || unionKey.Index >= currentValue.length) continue;
                        const val = currentValue[unionKey.Index];
                        if (val !== undefined) {
                            selectorSlice.push(val);
                            selectorSliceElementPaths.push(unionKey);
                        }
                    }
                } else if (recursiveSegment.LinearCollectionSelector) {
                    const lcs = recursiveSegment.LinearCollectionSelector;
                    let start = lcs.Start !== undefined ? lcs.Start : 0;
                    if (start >= currentValue.length) return false;

                    let step = lcs.Step !== undefined && lcs.Step > 0 ? lcs.Step : 1;
                    let end = lcs.End !== undefined ? lcs.End : currentValue.length;
                    if (end > currentValue.length) end = currentValue.length;

                    for (let i = start; i < end; i += step) {
                        const val = currentValue[i];
                        if (val !== undefined) {
                            selectorSlice.push(val);
                            const seg = new CollectionMemberSegment();
                            seg.Index = i;
                            selectorSliceElementPaths.push(seg);
                        }
                    }
                }

                return this.selectorForEachLoop(
                    selectorSlice,
                    selectorSliceElementPaths,
                    currentPathSegmentIndexes,
                    currentPath
                );
            }
        }

        return false;
    }

    private selectorForEachLoop(
        selectorSlice: any[],
        selectorSliceElementPaths: RecursiveDescentSegment,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment
    ): boolean {
        if (selectorSlice.length === 0) return false;

        for (let i = 0; i < selectorSliceElementPaths.length; i++) {
            const nextPath = [...currentPath, selectorSliceElementPaths[i]];

            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    if (this._ifValueFoundInObject(nextPath, selectorSlice[i])) return true;
                    continue;
                }

                const recursiveDescentIndexes = new PathSegmentsIndexes();
                recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveDescentIndexes.CurrentCollection = 0;
                recursiveDescentIndexes.LastCollection =
                    (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                        .length - 1;

                if (this.recursiveDescentForEachValue(selectorSlice[i], recursiveDescentIndexes, nextPath)) return true;
                continue;
            }

            const recursiveIndexes = new PathSegmentsIndexes();
            recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
            recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
            recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
            recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

            if (this.recursiveForEachValue(selectorSlice[i], recursiveIndexes, nextPath)) return true;
        }
        return false;
    }

    private recursiveDescentForEachValue(
        currentValue: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment
    ): boolean {
        if (
            currentPathSegmentIndexes.CurrentRecursive > currentPathSegmentIndexes.LastRecursive ||
            currentPathSegmentIndexes.CurrentCollection > currentPathSegmentIndexes.LastCollection
        ) {
            return false;
        }

        if (currentValue === null || currentValue === undefined) {
            return false;
        }

        const recursiveDescentSearchSegment =
            this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][
                currentPathSegmentIndexes.CurrentCollection
            ];
        if (!recursiveDescentSearchSegment) return false;

        if (recursiveDescentSearchSegment.IsKeyRoot) {
            return this.recursiveForEachValue(currentValue, currentPathSegmentIndexes, [
                ...currentPath,
                recursiveDescentSearchSegment
            ]);
        }

        if (recursiveDescentSearchSegment.Key === undefined) {
            return false;
        }

        const isMap = IsMap(currentValue);
        const isObject = IsObject(currentValue) && !IsArray(currentValue) && !isMap;

        if (isMap || isObject) {
            const keys = isMap ? Array.from(currentValue.keys()) : Object.keys(currentValue);
            for (const valueKey of keys) {
                const mapEntryValue = isMap ? currentValue.get(valueKey) : (currentValue as any)[valueKey];
                if (mapEntryValue === undefined) continue;

                const nextPath = [...currentPath, recursiveDescentSearchSegment];

                if (String(valueKey) === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            if (this._ifValueFoundInObject(nextPath, mapEntryValue)) return true;
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
                            if (this.recursiveDescentForEachValue(mapEntryValue, recursiveDescentIndexes, nextPath))
                                return true;
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
                        if (this.recursiveForEachValue(mapEntryValue, recursiveIndexes, nextPath)) return true;
                    }
                }

                if (this.recursiveDescentForEachValue(mapEntryValue, currentPathSegmentIndexes, nextPath)) return true;
            }
        } else if (IsArray(currentValue)) {
            for (let i = 0; i < currentValue.length; i++) {
                const sliceArrayElementValue = currentValue[i];
                if (sliceArrayElementValue === undefined) continue;

                const seg = new CollectionMemberSegment();
                seg.Index = i;
                const nextPath = [...currentPath, seg];

                if (this.recursiveDescentForEachValue(sliceArrayElementValue, currentPathSegmentIndexes, nextPath))
                    return true;
            }
        }

        return false;
    }
}
