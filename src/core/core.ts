/**
 * Base error expected to be thrown by modules in/using this library.
 */
export class JsonError extends Error {
    private _Data?: JsonObject;
    public get Data(): JsonObject | undefined {
        return this._Data;
    }
    public set Data(value: JsonObject | undefined) {
        this._Data = value;
    }

    constructor(message: string, cause?: Error, name?: string) {
        super(message, { cause });
        this.name = name || 'JsonError';

        // Restore prototype chain for old environments
        Object.setPrototypeOf(this, JsonError.prototype);
    }

    public static fromJSON(json: string | object): JsonError {
        let data: any = json;
        if (typeof json === 'string') {
            data = JSON.parse(json);
        }

        let cause: Error | undefined;
        if (data.cause) {
            cause = new Error(data.cause.message || String(data.cause));
            if (data.cause.name) cause.name = data.cause.name;
            if (data.cause.stack) cause.stack = data.cause.stack;
        }

        const instance = new JsonError(data.message || '', cause, data.name);
        if (data.Data) {
            instance.Data = data.Data;
        }
        if (data.stack) {
            instance.stack = data.stack;
        }
        return instance;
    }

    public toJSON(): object {
        return {
            name: this.name,
            message: this.message,
            stack: this.stack,
            cause: (this as any).cause,
            Data: this.Data
        };
    }
}

/**
 * Represents a JSON object (key-value pairs).
 * In TypeScript/JS, this is typically a Record with string keys.
 */
export type JsonObject = Record<string, any>;

/**
 * Represents a JSON array.
 */
export type JsonArray = any[];

/**
 * Helper function to convert all JavaScript types to json.
 *
 * Adds logic for the following types:
 * * {@link Map}
 * * {@link Set}
 * */
export function JSONstringify(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number
): string {
    return JSON.stringify(
        value instanceof Map ? Object.fromEntries(value.entries()) : value instanceof Set ? [...value] : value,
        replacer,
        space
    );
}
