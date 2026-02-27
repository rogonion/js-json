import { Parse, CollectionMemberSegment, type JSONPath, type RecursiveDescentSegment, JsonpathKeyRoot } from '@path';
import type { JSObject } from './object';
import { PathSegmentsIndexes } from '@internal';
import { DataKind, DynamicSchemaNode, GetDataKind, GetSchemaAtPath } from '@schema';
import { IsArray, IsDefined, IsFunction, IsMap, IsNumber, IsObject, IsSet, JsonError } from '@core';
import { JSObjectErrorCodes } from './core';

/**
 * Updates or creates new value(s) in {@link JSObject.Source}.
 *
 * If {@link JSObject.Schema} is supplied, it gives the module the ability to create user defined collections such as classes at different nesting levels.
 * Therefore, the {@link JSObject.Source} can be instantiated as a value of type any with undefined and end up being an array of nested classes.
 *
 * Updates {@link JSObject.NoOfResults} to indicate the number of modifications that were made in addition to updating {@link JSObject.LastError} with the last error encountered.
 */
export class JSObjectSet {
    private _object: JSObject;
    private _valueToSet: any;

    constructor(object: JSObject, valueToSet: any) {
        this._object = object;
        this._valueToSet = valueToSet;
    }

    public Set(jsonPath: JSONPath): number {
        if (jsonPath === JsonpathKeyRoot || jsonPath === '') {
            this._object.Source = this._valueToSet;
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

        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
            this._object.Source = this.recursiveSet(
                this._object.Source,
                currentPathSegmentIndexes,
                [],
                GetDataKind(this._object.Source)
            );
        } else {
            this._object.Source = this.recursiveDescentSet(this._object.Source, currentPathSegmentIndexes, []);
        }

        return this._object.NoOfResults || 0;
    }

    private recursiveSet(
        currentValue: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment,
        currentValueKind: DataKind
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

        if (recursiveSegment.IsKeyRoot) {
            if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                    return this._valueToSet;
                }

                const recursiveDescentIndexes = new PathSegmentsIndexes();
                recursiveDescentIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive + 1;
                recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                recursiveDescentIndexes.CurrentCollection = 0;
                recursiveDescentIndexes.LastCollection =
                    (this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive + 1] || [])
                        .length - 1;

                return this.recursiveDescentSet(currentValue, recursiveDescentIndexes, currentPath);
            }

            const recursiveIndexes = new PathSegmentsIndexes();
            recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
            recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
            recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
            recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;
            return this.recursiveSet(currentValue, recursiveIndexes, currentPath, currentValueKind);
        }

        if (!IsDefined(currentValue)) {
            try {
                currentValue = this.getDefaultValueAtPathSegment(
                    currentValue,
                    currentPathSegmentIndexes,
                    currentPath,
                    currentValueKind
                );
            } catch (e) {
                this._object.LastError = e as JsonError;
                return currentValue;
            }
        }

        if (IsMap(currentValue)) {
            if (IsDefined(recursiveSegment.Key) && !recursiveSegment.IsKeyIndexAll) {
                let mapEntrySchema: DynamicSchemaNode;
                if (this._object.Schema) {
                    mapEntrySchema = GetSchemaAtPath([...currentPath, recursiveSegment], this._object.Schema);
                } else {
                    mapEntrySchema = new DynamicSchemaNode({
                        Kind: DataKind.Any,
                        AssociativeCollectionEntryKeySchema: new DynamicSchemaNode({
                            Kind: DataKind.String,
                            TypeOf: 'string'
                        })
                    });
                }

                if (mapEntrySchema.AssociativeCollectionEntryKeySchema instanceof DynamicSchemaNode) {
                    let mapKey: any;
                    try {
                        mapKey = this.convertSourceToTargetType(
                            recursiveSegment.Key,
                            mapEntrySchema.AssociativeCollectionEntryKeySchema,
                            typeof recursiveSegment.Key
                        );
                    } catch (e) {
                        this._object.LastError = e as JsonError;
                        this._object.LastError = Object.assign(
                            new JsonError(
                                `convert key ${recursiveSegment.Key} failed`,
                                e as Error,
                                JSObjectErrorCodes.PathSegmentInvalid
                            ),
                            {
                                Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                            }
                        );
                    }

                    const mapValue = currentValue.get(mapKey);
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                const newMapValue = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    undefined,
                                    typeof mapValue
                                );
                                currentValue.set(mapKey, newMapValue);
                                this._object.NoOfResults++;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            const recursiveDescentValue = this.recursiveDescentSet(mapValue, recursiveDescentIndexes, [
                                ...currentPath,
                                recursiveSegment
                            ]);
                            currentValue.set(mapKey, recursiveDescentValue);
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        const recursiveSetValue = this.recursiveSet(
                            mapValue,
                            recursiveIndexes,
                            [...currentPath, recursiveSegment],
                            GetDataKind(mapValue)
                        );
                        currentValue.set(mapKey, recursiveSetValue);
                    }
                } else {
                    this._object.LastError = Object.assign(
                        new JsonError(
                            `schema for key ${recursiveSegment.Key} not found`,
                            undefined,
                            JSObjectErrorCodes.PathSegmentInvalid
                        ),
                        {
                            Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                        }
                    );
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const mapKey of Array.from(currentValue.keys())) {
                    const mapValue = currentValue.get(mapKey);

                    const mapKeyPathSegment = new CollectionMemberSegment();
                    mapKeyPathSegment.Key = String(mapKey);

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let mapEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    mapEntrySchema = GetSchemaAtPath(
                                        [...currentPath, mapKeyPathSegment],
                                        this._object.Schema
                                    );
                                }
                                const newMapValue = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    mapEntrySchema,
                                    typeof mapValue
                                );
                                currentValue.set(mapKey, newMapValue);
                                this._object.NoOfResults++;
                                continue;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            const recursiveDescentValue = this.recursiveDescentSet(mapValue, recursiveDescentIndexes, [
                                ...currentPath,
                                recursiveSegment
                            ]);
                            currentValue.set(mapKey, recursiveDescentValue);
                            continue;
                        }
                    }

                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                    const recursiveSetValue = this.recursiveSet(
                        mapValue,
                        recursiveIndexes,
                        [...currentPath, recursiveSegment],
                        GetDataKind(mapValue)
                    );
                    currentValue.set(mapKey, recursiveSetValue);
                }
            } else if (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0) {
                for (const unionKey of recursiveSegment.UnionSelector) {
                    if (!IsDefined(unionKey.Key)) continue;

                    let mapEntrySchema: DynamicSchemaNode;
                    if (this._object.Schema) {
                        mapEntrySchema = GetSchemaAtPath([...currentPath, unionKey], this._object.Schema);
                    } else {
                        mapEntrySchema = new DynamicSchemaNode({
                            Kind: DataKind.Any,
                            AssociativeCollectionEntryKeySchema: new DynamicSchemaNode({
                                Kind: DataKind.String,
                                TypeOf: 'string'
                            })
                        });
                    }

                    if (mapEntrySchema.AssociativeCollectionEntryKeySchema instanceof DynamicSchemaNode) {
                        let mapKey: any;
                        try {
                            mapKey = this.convertSourceToTargetType(
                                unionKey.Key,
                                mapEntrySchema.AssociativeCollectionEntryKeySchema,
                                typeof unionKey.Key
                            );
                        } catch (e) {
                            this._object.LastError = e as JsonError;
                            this._object.LastError = Object.assign(
                                new JsonError(
                                    `convert key ${unionKey.Key} failed`,
                                    e as Error,
                                    JSObjectErrorCodes.PathSegmentInvalid
                                ),
                                {
                                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                                }
                            );
                            continue;
                        }

                        const mapValue = currentValue.get(mapKey);
                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (
                                currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive
                            ) {
                                try {
                                    const newMapValue = this.convertSourceToTargetType(
                                        this._valueToSet,
                                        undefined,
                                        typeof mapValue
                                    );
                                    currentValue.set(mapKey, newMapValue);
                                    this._object.NoOfResults++;
                                    continue;
                                } catch (e) {
                                    this._object.LastError = e as JsonError;
                                }
                            }

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

                            const recursiveDescentValue = this.recursiveDescentSet(mapValue, recursiveDescentIndexes, [
                                ...currentPath,
                                recursiveSegment
                            ]);
                            currentValue.set(mapKey, recursiveDescentValue);
                            continue;
                        }

                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        const recursiveSetValue = this.recursiveSet(
                            mapValue,
                            recursiveIndexes,
                            [...currentPath, recursiveSegment],
                            GetDataKind(mapValue)
                        );
                        currentValue.set(mapKey, recursiveSetValue);
                        continue;
                    }

                    this._object.LastError = Object.assign(
                        new JsonError(
                            `schema for key ${unionKey.Key} not found`,
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
                        `in map unsupported recursive segment ${recursiveSegment.toString()}`,
                        undefined,
                        JSObjectErrorCodes.PathSegmentInvalid
                    ),
                    {
                        Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                    }
                );
            }
        } else if (IsArray(currentValue)) {
            if (IsNumber(recursiveSegment.Index)) {
                if (recursiveSegment.Index >= currentValue.length) {
                    for (let i = currentValue.length; i <= recursiveSegment.Index; i++) {
                        currentValue.push(undefined);
                    }
                }

                if (recursiveSegment.Index >= currentValue.length) {
                    this._object.LastError = Object.assign(
                        new JsonError(
                            `in array, index ${recursiveSegment.Index} out of range`,
                            undefined,
                            JSObjectErrorCodes.PathSegmentInvalid
                        ),
                        {
                            Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                        }
                    );
                } else {
                    const arrayValue = currentValue[recursiveSegment.Index];

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let arrayEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    arrayEntrySchema = GetSchemaAtPath(
                                        [...currentPath, recursiveSegment],
                                        this._object.Schema
                                    );
                                }
                                currentValue[recursiveSegment.Index] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    arrayEntrySchema,
                                    typeof arrayValue
                                );
                                this._object.NoOfResults++;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            currentValue[recursiveSegment.Index] = this.recursiveDescentSet(
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

                        currentValue[recursiveSegment.Index] = this.recursiveSet(
                            arrayValue,
                            recursiveIndexes,
                            [...currentPath, recursiveSegment],
                            GetDataKind(arrayValue)
                        );
                    }
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                if (
                    currentPathSegmentIndexes.CurrentCollection == currentPathSegmentIndexes.LastCollection &&
                    currentPathSegmentIndexes.CurrentRecursive == currentPathSegmentIndexes.LastRecursive
                ) {
                    currentValue = [];
                    this._object.NoOfResults++;
                } else {
                    for (let i = 0; i < currentValue.length; i++) {
                        const arrayValue = currentValue[i];

                        const arrayIndexPathSegment = new CollectionMemberSegment();
                        arrayIndexPathSegment.Index = i;

                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (
                                currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive
                            ) {
                                try {
                                    let arrayEntrySchema: DynamicSchemaNode | undefined;
                                    if (this._object.Schema) {
                                        arrayEntrySchema = GetSchemaAtPath(
                                            [...currentPath, arrayIndexPathSegment],
                                            this._object.Schema
                                        );
                                    }
                                    currentValue[i] = this.convertSourceToTargetType(
                                        this._valueToSet,
                                        arrayEntrySchema,
                                        typeof arrayValue
                                    );
                                    this._object.NoOfResults++;
                                    continue;
                                } catch (e) {
                                    this._object.LastError = e as JsonError;
                                }
                            } else {
                                const recursiveDescentIndexes = new PathSegmentsIndexes();
                                recursiveDescentIndexes.CurrentRecursive =
                                    currentPathSegmentIndexes.CurrentRecursive + 1;
                                recursiveDescentIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                                recursiveDescentIndexes.CurrentCollection = 0;
                                recursiveDescentIndexes.LastCollection =
                                    (
                                        this._object.RecursiveDescentSegments[
                                            currentPathSegmentIndexes.CurrentRecursive + 1
                                        ] || []
                                    ).length - 1;

                                currentValue[i] = this.recursiveDescentSet(arrayValue, recursiveDescentIndexes, [
                                    ...currentPath,
                                    recursiveSegment
                                ]);
                                continue;
                            }
                        }

                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        currentValue[i] = this.recursiveSet(
                            arrayValue,
                            recursiveIndexes,
                            [...currentPath, recursiveSegment],
                            GetDataKind(arrayValue)
                        );
                    }
                }
            } else if (recursiveSegment.UnionSelector) {
                let maxIndex = -1;
                for (const unionKey of recursiveSegment.UnionSelector) {
                    if (!IsNumber(unionKey.Index)) continue;
                    if (unionKey.Index > maxIndex) maxIndex = unionKey.Index;
                }
                if (maxIndex >= currentValue.length && IsArray(currentValue)) {
                    for (let i = currentValue.length; i <= maxIndex; i++) {
                        currentValue.push(undefined);
                    }
                }

                for (const unionKey of recursiveSegment.UnionSelector) {
                    if (!IsNumber(unionKey.Index) || unionKey.Index >= currentValue.length) continue;

                    const arrayValue = currentValue[unionKey.Index];

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let arrayEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    arrayEntrySchema = GetSchemaAtPath([...currentPath, unionKey], this._object.Schema);
                                }
                                currentValue[unionKey.Index] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    arrayEntrySchema,
                                    typeof arrayValue
                                );
                                this._object.NoOfResults++;
                                continue;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
                            }
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

                        currentValue[unionKey.Index] = this.recursiveDescentSet(arrayValue, recursiveDescentIndexes, [
                            ...currentPath,
                            recursiveSegment
                        ]);
                        continue;
                    }

                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                    currentValue[unionKey.Index] = this.recursiveSet(
                        arrayValue,
                        recursiveIndexes,
                        [...currentPath, recursiveSegment],
                        GetDataKind(arrayValue)
                    );
                    continue;
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

                for (let i = start; i < end; i += step) {
                    if (i >= currentValue.length) continue;

                    const arrayValue = currentValue[i];

                    const arrayIndexPathSegment = new CollectionMemberSegment();
                    arrayIndexPathSegment.Index = i;

                    let arrayEntrySchema: DynamicSchemaNode;
                    if (this._object.Schema) {
                        arrayEntrySchema = GetSchemaAtPath(
                            [...currentPath, arrayIndexPathSegment],
                            this._object.Schema
                        );
                    } else {
                        arrayEntrySchema = new DynamicSchemaNode({
                            Kind: DataKind.Any
                        });
                    }

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                currentValue[arrayIndexPathSegment.Index] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    arrayEntrySchema,
                                    typeof arrayValue
                                );
                                this._object.NoOfResults++;
                                continue;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
                            }
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

                        currentValue[arrayIndexPathSegment.Index] = this.recursiveDescentSet(
                            arrayValue,
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

                    currentValue[arrayIndexPathSegment.Index] = this.recursiveSet(
                        arrayValue,
                        recursiveIndexes,
                        [...currentPath, recursiveSegment],
                        GetDataKind(arrayValue)
                    );
                    continue;
                }
            } else {
                this._object.LastError = Object.assign(
                    new JsonError(
                        `in array unsupported recursive segment ${recursiveSegment.toString()}`,
                        undefined,
                        JSObjectErrorCodes.PathSegmentInvalid
                    ),
                    {
                        Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                    }
                );
            }
        } else if (IsSet(currentValue)) {
            if (recursiveSegment.IsKeyIndexAll) {
                const arrayFromSet = Array.from<any>(currentValue);

                for (let i = 0; i < arrayFromSet.length; i++) {
                    const arrayValue = arrayFromSet[i];

                    const arrayIndexPathSegment = new CollectionMemberSegment();
                    arrayIndexPathSegment.Index = i;
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let setEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    setEntrySchema = GetSchemaAtPath(
                                        [...currentPath, arrayIndexPathSegment],
                                        this._object.Schema
                                    );
                                }
                                arrayFromSet[i] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    setEntrySchema,
                                    typeof arrayValue
                                );
                                this._object.NoOfResults++;
                                continue;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
                            }
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

                        arrayFromSet[i] = this.recursiveDescentSet(arrayValue, recursiveDescentIndexes, [
                            ...currentPath,
                            recursiveSegment
                        ]);
                        continue;
                    }

                    const recursiveIndexes = new PathSegmentsIndexes();
                    recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                    recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                    recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                    recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                    arrayFromSet[i] = this.recursiveSet(
                        arrayValue,
                        recursiveIndexes,
                        [...currentPath, recursiveSegment],
                        GetDataKind(arrayValue)
                    );
                }

                currentValue = new Set(arrayFromSet);
            } else {
                this._object.LastError = Object.assign(
                    new JsonError(
                        `in set unsupported recursive segment ${recursiveSegment.toString()}`,
                        undefined,
                        JSObjectErrorCodes.PathSegmentInvalid
                    ),
                    {
                        Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                    }
                );
            }
        } else if (IsObject(currentValue)) {
            if (IsDefined(recursiveSegment.Key) && !recursiveSegment.IsKeyIndexAll) {
                let pojoEntrySchema: DynamicSchemaNode;
                if (this._object.Schema) {
                    pojoEntrySchema = GetSchemaAtPath([...currentPath, recursiveSegment], this._object.Schema);
                } else {
                    pojoEntrySchema = new DynamicSchemaNode({
                        Kind: DataKind.Any,
                        AssociativeCollectionEntryKeySchema: new DynamicSchemaNode({
                            Kind: DataKind.String,
                            TypeOf: 'string'
                        })
                    });
                }

                if (pojoEntrySchema.AssociativeCollectionEntryKeySchema instanceof DynamicSchemaNode) {
                    let pojoKey: any;
                    try {
                        pojoKey = this.convertSourceToTargetType(
                            recursiveSegment.Key,
                            pojoEntrySchema.AssociativeCollectionEntryKeySchema,
                            typeof recursiveSegment.Key
                        );
                    } catch (e) {
                        this._object.LastError = e as JsonError;
                        this._object.LastError = Object.assign(
                            new JsonError(
                                `convert key ${recursiveSegment.Key} failed`,
                                e as Error,
                                JSObjectErrorCodes.PathSegmentInvalid
                            ),
                            {
                                Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                            }
                        );
                    }

                    const pojoValue = (currentValue as any)[pojoKey];
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                (currentValue as any)[pojoKey] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    undefined,
                                    typeof pojoValue
                                );
                                this._object.NoOfResults++;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            (currentValue as any)[pojoKey] = this.recursiveDescentSet(
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

                        (currentValue as any)[pojoKey] = this.recursiveSet(
                            pojoValue,
                            recursiveIndexes,
                            [...currentPath, recursiveSegment],
                            GetDataKind(pojoValue)
                        );
                    }
                } else {
                    this._object.LastError = Object.assign(
                        new JsonError(
                            `schema for key ${recursiveSegment.Key} not found`,
                            undefined,
                            JSObjectErrorCodes.PathSegmentInvalid
                        ),
                        {
                            Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                        }
                    );
                }
            } else if (recursiveSegment.IsKeyIndexAll) {
                for (const pojoKey of Object.keys(currentValue)) {
                    const pojoValue = (currentValue as any)[pojoKey];

                    const pojoKeyPathSegment = new CollectionMemberSegment();
                    pojoKeyPathSegment.Key = String(pojoKey);

                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let pojoEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    pojoEntrySchema = GetSchemaAtPath(
                                        [...currentPath, pojoKeyPathSegment],
                                        this._object.Schema
                                    );
                                }
                                (currentValue as any)[pojoKey] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    pojoEntrySchema,
                                    typeof pojoValue
                                );
                                this._object.NoOfResults++;
                                continue;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            (currentValue as any)[pojoKey] = this.recursiveDescentSet(
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

                    (currentValue as any)[pojoKey] = this.recursiveSet(
                        pojoValue,
                        recursiveIndexes,
                        [...currentPath, recursiveSegment],
                        GetDataKind(pojoValue)
                    );
                }
            } else if (IsArray(recursiveSegment.UnionSelector) && recursiveSegment.UnionSelector.length > 0) {
                for (const unionKey of recursiveSegment.UnionSelector) {
                    if (!IsDefined(unionKey.Key)) continue;

                    let pojoEntrySchema: DynamicSchemaNode;
                    if (this._object.Schema) {
                        pojoEntrySchema = GetSchemaAtPath([...currentPath, recursiveSegment], this._object.Schema);
                    } else {
                        pojoEntrySchema = new DynamicSchemaNode({
                            Kind: DataKind.Any,
                            AssociativeCollectionEntryKeySchema: new DynamicSchemaNode({
                                Kind: DataKind.String,
                                TypeOf: 'string'
                            })
                        });
                    }

                    if (pojoEntrySchema.AssociativeCollectionEntryKeySchema instanceof DynamicSchemaNode) {
                        let pojoKey: any;
                        try {
                            pojoKey = this.convertSourceToTargetType(
                                unionKey.Key,
                                pojoEntrySchema.AssociativeCollectionEntryKeySchema,
                                typeof unionKey.Key
                            );
                        } catch (e) {
                            this._object.LastError = e as JsonError;
                            this._object.LastError = Object.assign(
                                new JsonError(
                                    `convert key ${recursiveSegment.Key} failed`,
                                    e as Error,
                                    JSObjectErrorCodes.PathSegmentInvalid
                                ),
                                {
                                    Data: { CurrentValue: currentValue, CurrentPathSegment: currentPath }
                                }
                            );
                            continue;
                        }

                        const mapValue = (currentValue as any)[pojoKey];
                        if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                            if (
                                currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive
                            ) {
                                try {
                                    (currentValue as any)[pojoKey] = this.convertSourceToTargetType(
                                        this._valueToSet,
                                        undefined,
                                        typeof mapValue
                                    );
                                    this._object.NoOfResults++;
                                    continue;
                                } catch (e) {
                                    this._object.LastError = e as JsonError;
                                }
                            }

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

                            (currentValue as any)[pojoKey] = this.recursiveDescentSet(
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

                        (currentValue as any)[pojoKey] = this.recursiveSet(
                            mapValue,
                            recursiveIndexes,
                            [...currentPath, recursiveSegment],
                            GetDataKind(mapValue)
                        );
                        continue;
                    }

                    this._object.LastError = Object.assign(
                        new JsonError(
                            `schema for key ${unionKey.Key} not found`,
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
                        `in pojo unsupported recursive segment ${recursiveSegment.toString()}`,
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

    /**
     * Attempts to create a new zero-value for the current path segment.
     *
     * It uses the Schema if available to determine the correct type (e.g. specific struct vs generic map).
     * @param value
     * @param currentPathSegmentIndexes
     * @param currentPath
     * @param valueType
     * @returns
     */
    private getDefaultValueAtPathSegment(
        value: any,
        currentPathSegmentIndexes: PathSegmentsIndexes,
        currentPath: RecursiveDescentSegment,
        valueKind?: DataKind
    ): any {
        if (this._object.Schema) {
            const valueSchema = GetSchemaAtPath(currentPath, this._object.Schema);
            if (valueSchema) {
                if (IsFunction(valueSchema.DefaultValue)) {
                    return valueSchema.DefaultValue();
                }
            }
            if (IsDefined(valueSchema.Kind)) {
                valueKind = valueSchema.Kind;
            }
        }

        if (!IsDefined(valueKind)) {
            valueKind = GetDataKind(value);
        }

        let newValue: any;

        switch (valueKind) {
            case DataKind.String:
                newValue = '';
                break;
            case DataKind.Number:
                newValue = 0;
                break;
            case DataKind.BigInt:
                newValue = 0n;
                break;
            case DataKind.Boolean:
                newValue = false;
                break;
            case DataKind.Symbol:
                newValue = Symbol();
                break;
            case DataKind.Function:
                newValue = () => {};
                break;
            case DataKind.Array:
                newValue = [];
                break;
            case DataKind.Map:
                newValue = new Map<any, any>();
                break;
            case DataKind.Set:
                newValue = new Set<any>();
                break;
            case DataKind.Object:
            default:
                const currentPathSegment =
                    this._object.RecursiveDescentSegments[currentPathSegmentIndexes.CurrentRecursive][
                        currentPathSegmentIndexes.CurrentCollection
                    ];
                if (!currentPathSegment) {
                    if (valueKind === DataKind.Object) {
                        throw Object.assign(
                            new JsonError('indexes empty', undefined, JSObjectErrorCodes.PathSegmentInvalid),
                            {
                                Data: { CurrentValue: value, CurrentPathSegment: currentPath }
                            }
                        );
                    }
                    newValue = undefined;
                    break;
                }
                if (
                    currentPathSegment.Index !== undefined ||
                    (currentPathSegment.UnionSelector &&
                        currentPathSegment.UnionSelector.length > 0 &&
                        currentPathSegment.UnionSelector[0].Index !== undefined) ||
                    currentPathSegment.LinearCollectionSelector
                ) {
                    newValue = [];
                } else {
                    newValue = {};
                }
                break;
        }

        return newValue;
    }

    private recursiveDescentSet(
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
            return this.recursiveSet(currentValue, currentPathSegmentIndexes, currentPath, GetDataKind(currentValue));
        }

        if (IsMap(currentValue)) {
            for (const mapKey of Array.from(currentValue.keys())) {
                const keyPathSegment = new CollectionMemberSegment();
                keyPathSegment.Key = String(mapKey);

                const mapValue = currentValue.get(mapKey);

                if (keyPathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let mapEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    mapEntrySchema = GetSchemaAtPath(
                                        [...currentPath, recursiveDescentSearchSegment],
                                        this._object.Schema
                                    );
                                }
                                const newMapValue = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    mapEntrySchema,
                                    typeof mapValue
                                );
                                currentValue.set(mapKey, newMapValue);
                                this._object.NoOfResults++;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            const recursiveDescentValue = this.recursiveDescentSet(mapValue, recursiveDescentIndexes, [
                                ...currentPath,
                                keyPathSegment
                            ]);
                            currentValue.set(mapKey, recursiveDescentValue);
                        }
                    } else {
                        const recursiveIndexes = new PathSegmentsIndexes();
                        recursiveIndexes.CurrentRecursive = currentPathSegmentIndexes.CurrentRecursive;
                        recursiveIndexes.LastRecursive = currentPathSegmentIndexes.LastRecursive;
                        recursiveIndexes.CurrentCollection = currentPathSegmentIndexes.CurrentCollection + 1;
                        recursiveIndexes.LastCollection = currentPathSegmentIndexes.LastCollection;

                        const recursiveSetValue = this.recursiveSet(
                            mapValue,
                            recursiveIndexes,
                            [...currentPath, keyPathSegment],
                            GetDataKind(mapValue)
                        );
                        currentValue.set(mapKey, recursiveSetValue);
                    }
                } else {
                    const recursiveDescentValue = this.recursiveDescentSet(mapValue, currentPathSegmentIndexes, [
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

                currentValue[i] = this.recursiveDescentSet(arrayValue, currentPathSegmentIndexes, [
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

                arrayFromSet[i] = this.recursiveDescentSet(arrayValue, currentPathSegmentIndexes, [
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

                if (keyPathSegment.Key === recursiveDescentSearchSegment.Key) {
                    if (currentPathSegmentIndexes.CurrentCollection === currentPathSegmentIndexes.LastCollection) {
                        if (currentPathSegmentIndexes.CurrentRecursive === currentPathSegmentIndexes.LastRecursive) {
                            try {
                                let mapEntrySchema: DynamicSchemaNode | undefined;
                                if (this._object.Schema) {
                                    mapEntrySchema = GetSchemaAtPath(
                                        [...currentPath, recursiveDescentSearchSegment],
                                        this._object.Schema
                                    );
                                }
                                (currentValue as any)[pojoKey] = this.convertSourceToTargetType(
                                    this._valueToSet,
                                    mapEntrySchema,
                                    typeof pojoValue
                                );
                                this._object.NoOfResults++;
                            } catch (e) {
                                this._object.LastError = e as JsonError;
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

                            (currentValue as any)[pojoKey] = this.recursiveDescentSet(
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

                        (currentValue as any)[pojoKey] = this.recursiveSet(
                            pojoValue,
                            recursiveIndexes,
                            [...currentPath, keyPathSegment],
                            GetDataKind(pojoValue)
                        );
                    }
                } else {
                    (currentValue as any)[pojoKey] = this.recursiveDescentSet(pojoValue, currentPathSegmentIndexes, [
                        ...currentPath,
                        keyPathSegment
                    ]);
                }
            }
        } else {
            this._object.LastError = Object.assign(
                new JsonError(
                    `unsupported value at recursive segment ${recursiveDescentSearchSegment.toString()}`,
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

    private convertSourceToTargetType(
        source: any,
        sourceSchema: DynamicSchemaNode | undefined,
        sourceType: string
    ): any {
        if (!sourceSchema && sourceType) {
            sourceSchema = new DynamicSchemaNode({
                TypeOf: sourceType,
                Kind: GetDataKind(source)
            });
        }

        if (sourceSchema && this._object.DefaultConverter) {
            return this._object.DefaultConverter.Convert(source, sourceSchema);
        }
        return source;
    }
}
