import { TestData } from '@internal';
import { AreEqual, JSObject } from '@object';
import { type JSONPath } from '@path';
import { describe, expect, it } from 'vitest';
import { User, ComplexData } from './misc';

describe('JSObject ForEach', () => {
    const areEqual = new AreEqual();

    it.each(testData)('$TestTitle', (testData) => {
        const res: any[] = [];
        const obj = new JSObject();
        obj.Source = testData.Object;

        obj.ForEach(testData.Path, (_path, value) => {
            res.push(value);
            return false;
        });

        try {
            expect(areEqual.AreEqual(res, testData.Expected)).toBe(true);
        } catch (e) {
            console.log(
                'expected=',
                JSON.stringify(testData.Expected, null, 2),
                '\n',
                'got=',
                JSON.stringify(res, null, 2),
                '\n',
                'Path=',
                testData.Path
            );
            throw e;
        }
    });

    it('should exit early when callback returns true', () => {
        const data = [1, 2, 3, 4, 5];
        const res: number[] = [];
        const obj = new JSObject();
        obj.Source = data;

        obj.ForEach('$[*]', (_path, value) => {
            res.push(value);
            return value === 2;
        });

        expect(res).toEqual([1, 2]);
    });
});

class ForEachData extends TestData {
    private _Object: any;
    public get Object(): any {
        return this._Object;
    }
    public set Object(value: any) {
        this._Object = value;
    }

    private _Path: JSONPath = '';
    public get Path(): JSONPath {
        return this._Path;
    }
    public set Path(value: JSONPath) {
        this._Path = value;
    }

    private _Expected: any;
    public get Expected(): any {
        return this._Expected;
    }
    public set Expected(value: any) {
        this._Expected = value;
    }
}

const testData: ForEachData[] = [
    Object.assign(new ForEachData(), {
        TestTitle: 'Test Case 1',
        Object: [
            new Map([['User', Object.assign(new User(), { Name: 'Alice' })]]),
            Object.assign(new ComplexData(), {
                User: Object.assign(new User(), { Name: 'Bob' }),
                Items: [{ Name: 'Item 1' }, { Name: 'Item 2' }]
            })
        ],
        Path: '$..Name',
        Expected: ['Alice', 'Item 1', 'Item 2', 'Bob']
    }),
    Object.assign(new ForEachData(), {
        TestTitle: 'Test Case 2',
        Object: [
            new Map([['one', { Three: [0, 1, 2, 3, new Map([['04', [0, 4]]]), 5, 6, 7, 8, 9] }]]),
            { Two: new Map([['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]]) },
            [new Map([['Three', [0, 1, 2, 3, { TwentyFour: 24 }, 5, 6, 7, 8, 9]]])]
        ],
        Path: "$..Three[::2]['TwentyFour','04']",
        Expected: [[0, 4], 24]
    }),
    Object.assign(new ForEachData(), {
        TestTitle: 'Test Case 3',
        Object: [
            new Map([['one', { Three: [0, 1, 2, 3, [4], 5, 6, 7, 8, 9] }]]),
            { Two: new Map([['Three', [0, 1, 2, 3, new Map([['04', '04']]), 5, 6, 7, 8, 9]]]) },
            [new Map([['Three', [0, 1, 2, 3, { TwentyFour: 24 }, 5, 6, 7, 8, 9]]])]
        ],
        Path: "$..Three[::2]['TwentyFour','04']",
        Expected: ['04', 24]
    }),
    Object.assign(new ForEachData(), {
        TestTitle: 'Test Case 4',
        Object: [
            new Map([['one', { Three: [0, 1, 2, 3, [new Map([['04', '04']])], 5, 6, 7, 8, 9] }]]),
            { Two: new Map([['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]]) },
            [new Map([['Three', [0, 1, 2, 3, [{ TwentyFour: 24 }], 5, 6, 7, 8, 9]]])]
        ],
        Path: '$..Three[::2]..TwentyFour',
        Expected: [24]
    }),
    Object.assign(new ForEachData(), {
        TestTitle: 'Test Case 5',
        Object: new Map([
            [
                'child',
                [
                    null,
                    new Map<string, any>([
                        [
                            'nectar',
                            new Map([
                                [
                                    'willy',
                                    [
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        [null, null, null, 'smitty'],
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        new Map<string, any>([
                                            ['oxford', 'willow'],
                                            ['bee', [null, null, null, 5]]
                                        ])
                                    ]
                                ],
                                ['two', [1, 2, 3, 4, 5]]
                            ])
                        ],
                        ['mocha', { Nacho: 'cheese', Amount: 45.56 }]
                    ]),
                    null,
                    null,
                    'another child'
                ]
            ]
        ]),
        Path: '$.child[20].wind',
        Expected: []
    }),
    Object.assign(new ForEachData(), {
        TestTitle: 'Test Case 6',
        Object: new Map([
            [
                'child',
                [
                    null,
                    new Map<string, any>([
                        [
                            'nectar',
                            new Map([
                                [
                                    'willy',
                                    [
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        [null, null, null, 'smitty'],
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        null,
                                        new Map<string, any>([
                                            ['oxford', 'willow'],
                                            ['bee', [null, null, null, 5]]
                                        ])
                                    ]
                                ],
                                ['two', [1, 2, 3, 4, 5]]
                            ])
                        ],
                        ['mocha', { Nacho: 'cheese', Amount: 45.56 }]
                    ]),
                    null,
                    null,
                    'another child'
                ]
            ]
        ]),
        Path: '$.child[1].nectar.two[*]',
        Expected: [1, 2, 3, 4, 5]
    })
];
