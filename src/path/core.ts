import { getJsonKey } from './__internal__';

/**
 * JSONPath is an alias for a string intended to represent a JSON path query.
 *
 * Example: `$.store.book[0].title`
 */
export type JSONPath = string;

/**
 * Represents the final deconstructed JSONPath string after parsing.
 *
 * It is a 2D slice where the first dimension separates segments by the recursive descent operator `..`.
 */
export type RecursiveDescentSegments = RecursiveDescentSegment[];

/**
 * Represents a sequence of path segments that are directly connected
 * (e.g. by dot notation or brackets) without any recursive descent operators.
 */
export type RecursiveDescentSegment = CollectionMemberSegment[];

export class LinearCollectionSelector {
    /**
     * Start index for the slice (inclusive).
     */
    private _Start?: number;
    public get Start(): number | undefined {
        return this._Start;
    }
    public set Start(value: number | undefined) {
        this._Start = value;
    }

    /**
     * End index for the slice (exclusive).
     */
    private _End?: number;
    public get End(): number | undefined {
        return this._End;
    }
    public set End(value: number | undefined) {
        this._End = value;
    }

    /**
     * Step for the slice.
     */
    private _Step?: number;
    public get Step(): number | undefined {
        return this._Step;
    }
    public set Step(value: number | undefined) {
        this._Step = value;
    }

    public toString(): string {
        let str = JsonpathLeftBracket;
        if (this.Start !== undefined) {
            str += this.Start;
        }
        str += ':';
        if (this.End !== undefined) {
            str += this.End;
        }
        str += ':';
        if (this.Step !== undefined) {
            str += this.Step;
        }
        str += JsonpathRightBracket;
        return str;
    }
}

/**
 * CollectionMemberSegment represents a single atomic segment in a JSONPath.
 *
 * It holds information about the key, index, or selector used at that specific point in the path.
 */
export class CollectionMemberSegment {
    /**
     * Key represents the map key or property name.
     *  */
    private _Key?: string;
    public get Key(): string | undefined {
        return this._Key;
    }
    public set Key(value: string | undefined) {
        this._Key = value;
    }

    /**
     * IsKeyIndexAll is true if the segment is a wildcard `*`.
     */
    private _IsKeyIndexAll: boolean = false;
    public get IsKeyIndexAll(): boolean {
        return this._IsKeyIndexAll;
    }
    public set IsKeyIndexAll(value: boolean) {
        this._IsKeyIndexAll = value;
    }

    /**
     * IsKeyRoot is true if the segment is the root `$`.
     */
    private _IsKeyRoot: boolean = false;
    public get IsKeyRoot(): boolean {
        return this._IsKeyRoot;
    }
    public set IsKeyRoot(value: boolean) {
        this._IsKeyRoot = value;
    }

    public _Index?: number;
    public get Index(): number | undefined {
        return this._Index;
    }
    public set Index(value: number | undefined) {
        this._Index = value;
    }

    public _ExpectLinear: boolean = false;
    public get ExpectLinear(): boolean {
        return this._ExpectLinear;
    }
    public set ExpectLinear(value: boolean) {
        this._ExpectLinear = value;
    }

    public _ExpectAssociative: boolean = false;
    public get ExpectAssociative(): boolean {
        return this._ExpectAssociative;
    }
    public set ExpectAssociative(value: boolean) {
        this._ExpectAssociative = value;
    }

    public _LinearCollectionSelector?: LinearCollectionSelector;
    public get LinearCollectionSelector(): LinearCollectionSelector | undefined {
        return this._LinearCollectionSelector;
    }
    public set LinearCollectionSelector(value: LinearCollectionSelector | undefined) {
        this._LinearCollectionSelector = value;
    }

    public _UnionSelector?: CollectionMemberSegment[];
    public get UnionSelector(): CollectionMemberSegment[] | undefined {
        return this._UnionSelector;
    }
    public set UnionSelector(value: CollectionMemberSegment[] | undefined) {
        this._UnionSelector = value;
    }

    public toString(): string {
        if (this.Key !== undefined && !this.IsKeyIndexAll && !this.IsKeyRoot) {
            return getJsonKey(this.Key);
        }

        if (this.IsKeyIndexAll) {
            if (this.ExpectAssociative) {
                return JsonpathKeyIndexAll;
            }
            return `${JsonpathLeftBracket}${JsonpathKeyIndexAll}${JsonpathRightBracket}`;
        }

        if (this.IsKeyRoot) {
            return JsonpathKeyRoot;
        }

        if (this.Index !== undefined) {
            return `${JsonpathLeftBracket}${this.Index}${JsonpathRightBracket}`;
        }

        if (this.LinearCollectionSelector) {
            return this.LinearCollectionSelector.toString();
        }

        if (this.UnionSelector && this.UnionSelector.length > 0) {
            const segmentsStr: string[] = [];
            for (const u of this.UnionSelector) {
                let uStr = u.toString();
                if (uStr !== '') {
                    if (uStr.startsWith(JsonpathLeftBracket)) {
                        uStr = uStr.substring(1);
                    }
                    if (uStr.endsWith(JsonpathRightBracket)) {
                        uStr = uStr.substring(0, uStr.length - 1);
                    }
                    segmentsStr.push(uStr);
                }
            }
            if (segmentsStr.length > 0) {
                return `${JsonpathLeftBracket}${segmentsStr.join(',')}${JsonpathRightBracket}`;
            }
        }

        return '';
    }
}

export const JsonpathKeyIndexAll = '*';
export const JsonpathKeyRoot = '$';
export const JsonpathDotNotation = '.';
export const JsonpathRecursiveDescentNotation = '..';
export const JsonpathLeftBracket = '[';
export const JsonpathRightBracket = ']';
