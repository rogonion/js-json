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

    public static fromJSON(json: string | object): PathSegmentsIndexes {
        let data: any = json;
        if (typeof json === 'string') {
            data = JSON.parse(json);
        }

        const instance = new PathSegmentsIndexes();
        if (data) {
            if (typeof data.CurrentRecursive === 'number') instance.CurrentRecursive = data.CurrentRecursive;
            if (typeof data.LastRecursive === 'number') instance.LastRecursive = data.LastRecursive;
            if (typeof data.CurrentCollection === 'number') instance.CurrentCollection = data.CurrentCollection;
            if (typeof data.LastCollection === 'number') instance.LastCollection = data.LastCollection;
        }
        return instance;
    }

    public toJSON(): object {
        return {
            CurrentRecursive: this.CurrentRecursive,
            LastRecursive: this.LastRecursive,
            CurrentCollection: this.CurrentCollection,
            LastCollection: this.LastCollection
        };
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

    public static fromJSON(json: string | object): TestData {
        let data: any = json;
        if (typeof json === 'string') {
            data = JSON.parse(json);
        }

        const instance = new TestData();
        if (data) {
            if (typeof data.TestTitle === 'string') instance.TestTitle = data.TestTitle;
            if (typeof data.LogErrorsIfExpectedNotOk === 'boolean') instance.LogErrorsIfExpectedNotOk = data.LogErrorsIfExpectedNotOk;
        }
        return instance;
    }

    public toJSON(): object {
        return {
            TestTitle: this.TestTitle,
            LogErrorsIfExpectedNotOk: this.LogErrorsIfExpectedNotOk
        };
    }
}
