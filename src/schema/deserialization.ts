import { JsonError } from '@core';
import { Conversion } from './conversion';
import { type Converters, type DefaultConverter, type Deserializer, type Schema, SchemaErrorCodes } from './core';
import { parse } from 'yaml';

export class Deserialization implements Deserializer {
    private _DefaultConverter: DefaultConverter = new Conversion();
    public set DefaultConverter(value: DefaultConverter) {
        this._DefaultConverter = value;
        if (this._DefaultConverter instanceof Conversion) {
            this._DefaultConverter.CustomConverters = this._CustomConverters;
        }
    }

    private _CustomConverters: Converters = {};
    public set CustomConverters(value: Converters) {
        this._CustomConverters = value;
        if (this._DefaultConverter instanceof Conversion) {
            this._DefaultConverter.CustomConverters = value;
        }
    }

    public FromJSON(data: string, schema: Schema): any {
        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch (e) {
            throw Object.assign(
                new JsonError('Unmarshal from JSON failed', e as Error, SchemaErrorCodes.DataDeserializationFailed),
                {
                    Data: { Schema: schema, Source: data }
                }
            );
        }
        return this._DefaultConverter.Convert(parsed, schema);
    }

    public FromYAML(data: string, schema: Schema): any {
        let parsed: any;
        try {
            parsed = parse(data);
        } catch (e) {
            throw Object.assign(
                new JsonError('Unmarshal from YAML failed', e as Error, SchemaErrorCodes.DataDeserializationFailed),
                {
                    Data: { Schema: schema, Source: data }
                }
            );
        }
        return this._DefaultConverter.Convert(parsed, schema);
    }
}
