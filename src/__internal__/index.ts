export class PathSegmentsIndexes {
    private _CurrentRecursive: number = 0;
    public get CurrentRecursive(): number {
        return this._CurrentRecursive;
    }
    public set CurrentRecursive(value: number) {
        this._CurrentRecursive = value;
    }

    private _LastRecursive: number = 0;
    public get LastRecursive(): number {
        return this._LastRecursive;
    }
    public set LastRecursive(value: number) {
        this._LastRecursive = value;
    }

    private _CurrentCollection: number = 0;
    public get CurrentCollection(): number {
        return this._CurrentCollection;
    }
    public set CurrentCollection(value: number) {
        this._CurrentCollection = value;
    }

    private _LastCollection: number = 0;
    public get LastCollection(): number {
        return this._LastCollection;
    }
    public set LastCollection(value: number) {
        this._LastCollection = value;
    }
}

export class TestData {
    private _TestTitle: string = '';
    public get TestTitle(): string {
        return this._TestTitle;
    }
    public set TestTitle(value: string) {
        this._TestTitle = value;
    }

    private _LogErrorsIfExpectedNotOk: boolean = false;
    public get LogErrorsIfExpectedNotOk(): boolean {
        return this._LogErrorsIfExpectedNotOk;
    }
    public set LogErrorsIfExpectedNotOk(value: boolean) {
        this._LogErrorsIfExpectedNotOk = value;
    }
}
