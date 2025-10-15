/**Alias for string intended to represent JSON path.*/
export type JSONPath = string

/**alias that represents the final deconstructed JSONPath string using {@linkcode Parse}.*/
export type RecursiveDescentSegments = RecursiveDescentSegment[]

/**alias that represents a sequence of recursive descent segments.*/
export type RecursiveDescentSegment = CollectionMemberSegment[]

/**
 * For Path linear collections (slices and arrays) selector in JSON Path like this: [start:end:step]
 * */
export class LinearCollectionSelector {
    public Start?: number
    public IsStart?: boolean
    public End?: number
    public IsEnd?: boolean
    public Step?: number
    public IsStep?: boolean

    private constructor(builder: LinearCollectionSelectorBuilder) {
        Object.assign(this, builder)
    }

    public static create(): LinearCollectionSelectorBuilder {
        return new LinearCollectionSelectorBuilder()
    }
}

export class LinearCollectionSelectorBuilder {
    public build(): LinearCollectionSelector {
        return new (LinearCollectionSelector as any)(this) as LinearCollectionSelector
    }

    public Start?: number

    public WithStart(value?: number): LinearCollectionSelectorBuilder {
        this.Start = value
        return this
    }

    public IsStart?: boolean

    public WithIsStart(value?: boolean): LinearCollectionSelectorBuilder {
        this.IsStart = value
        return this
    }

    public End?: number

    public WithEnd(value?: number): LinearCollectionSelectorBuilder {
        this.End = value
        return this
    }

    public IsEnd?: boolean

    public WithIsEnd(value?: boolean): LinearCollectionSelectorBuilder {
        this.IsEnd = value
        return this
    }

    public Step?: number

    public WithStep(value?: number): LinearCollectionSelectorBuilder {
        this.Step = value
        return this
    }

    public IsStep?: boolean

    public WithIsStep(value?: boolean): LinearCollectionSelectorBuilder {
        this.IsStep = value
        return this
    }
}

export type UnionSelector = CollectionMemberSegment[]

/**
 * For final individual path segment in {@linkcode JSONPath}.
 * */
export class CollectionMemberSegment {
    public Key?: string
    public IsKey?: boolean
    public IsKeyRoot?: boolean
    public IsKeyIndexAll?: boolean
    public Index?: number
    public IsIndex?: boolean
    public ExpectLinear?: boolean
    public ExpectAssociative?: boolean
    public LinearCollectionSelector?: LinearCollectionSelector
    public UnionSelector?: UnionSelector

    private constructor(builder: CollectionMemberSegmentBuilder) {
        Object.assign(this, builder)
    }

    public static create(): CollectionMemberSegmentBuilder {
        return new CollectionMemberSegmentBuilder()
    }
}

export class CollectionMemberSegmentBuilder {
    public build() {
        return new (CollectionMemberSegment as any)(this) as CollectionMemberSegment
    }

    public Key?: string

    public WithKey(value?: string): CollectionMemberSegmentBuilder {
        this.Key = value
        return this
    }

    public IsKey?: boolean

    public WithIsKey(value?: boolean): CollectionMemberSegmentBuilder {
        this.IsKey = value
        return this
    }

    public IsKeyRoot?: boolean

    public WithIsKeyRoot(value?: boolean): CollectionMemberSegmentBuilder {
        this.IsKeyRoot = value
        return this
    }

    public IsKeyIndexAll?: boolean

    public WithIsKeyIndexAll(value?: boolean): CollectionMemberSegmentBuilder {
        this.IsKeyIndexAll = value
        return this
    }

    public Index?: number

    public WithIndex(value?: number): CollectionMemberSegmentBuilder {
        this.Index = value
        return this
    }

    public IsIndex?: boolean

    public WithIsIndex(value?: boolean): CollectionMemberSegmentBuilder {
        this.IsIndex = value
        return this
    }

    public ExpectLinear?: boolean

    public WithExpectLinear(value?: boolean): CollectionMemberSegmentBuilder {
        this.ExpectLinear = value
        return this
    }

    public ExpectAssociative?: boolean

    public WithExpectAssociative(value?: boolean): CollectionMemberSegmentBuilder {
        this.ExpectAssociative = value
        return this
    }

    public LinearCollectionSelector?: LinearCollectionSelector

    public WithLinearCollectionSelector(value?: LinearCollectionSelector): CollectionMemberSegmentBuilder {
        this.LinearCollectionSelector = value
        return this
    }

    public UnionSelector?: UnionSelector

    public WithUnionSelector(value?: UnionSelector): CollectionMemberSegmentBuilder {
        this.UnionSelector = value
        return this
    }
}

export const JsonpathKeyIndexAll = '*'
export const JsonpathKeyRoot = '$'
export const JsonpathDotNotation = '.'
export const JsonpathRecursiveDescentNotation = '..'
export const JsonpathLeftBracket = '['
export const JsonpathRightBracket = ']'
