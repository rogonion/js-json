export class PathSegmentsIndexes {
    public CurrentRecursive: number = 0
    public LastRecursive: number = 0
    public CurrentCollection: number = 0
    public LastCollection: number = 0

    private constructor(builder: PathSegmentsIndexesBuilder) {
        Object.assign(this, builder)
    }

    public static create(): PathSegmentsIndexesBuilder {
        return new PathSegmentsIndexesBuilder()
    }
}

export class PathSegmentsIndexesBuilder {
    public build(): PathSegmentsIndexes {
        return new (PathSegmentsIndexes as any)(this) as PathSegmentsIndexes
    }

    public CurrentRecursive: number = 0

    public WithCurrentRecursive(value: number): PathSegmentsIndexesBuilder {
        this.CurrentRecursive = value
        return this
    }

    public LastRecursive: number = 0

    public WithLastRecursive(value: number): PathSegmentsIndexesBuilder {
        this.LastRecursive = value
        return this
    }

    public CurrentCollection: number = 0

    public WithCurrentCollection(value: number): PathSegmentsIndexesBuilder {
        this.CurrentCollection = value
        return this
    }

    public LastCollection: number = 0

    public WithLastCollection(value: number): PathSegmentsIndexesBuilder {
        this.LastCollection = value
        return this
    }
}

export interface TestData {
    TestTitle?: string
    LogErrorsIfExpectedNotOk?: boolean
}