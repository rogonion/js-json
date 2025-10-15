import type {TestData} from '@internal'
import type {JSONPath, RecursiveDescentSegment} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual, ForEachValue} from '@object'
import {ComplexData, User} from '../misc.ts'
import {JSONstringify} from '@core'

describe('for_each', () => {
    it.each(TestData)('Path: $Path', (testData) => {
        let res: any[] = []
        try {
            new ForEachValue().ForEach(testData.Object, testData.Path, (_: RecursiveDescentSegment, value: any) => {
                res.push(value)
                return false
            })
            expect(new AreEqual().AreEqual(res, testData.Expected, false, true)).toBe(true)
        } catch (e) {
            console.log(
                'path=', testData.Path, '\n',
                'res=', JSONstringify(res), '\n',
                'expected=', JSONstringify(testData.Expected)
            )
            throw e
        }

    })
})

interface ForEachData extends TestData {
    Object: any
    Path: JSONPath
    Expected: any
}

const TestData: ForEachData[] = [
    {
        Object: [
            new Map<string, any>([
                ['User', (() => {
                    const x = new User()
                    x.Name = 'Alice'
                    return x
                })()]
            ]),
            (() => {
                const x = new ComplexData()
                x.Items = [{Name: 'Item 1', Value: 0}, {Name: 'Item 2', Value: 0}]
                x.User.Name = 'Bob'
                return x
            })()
        ],
        Path: '$..Name',
        Expected: ['Alice', 'Item 1', 'Item 2', 'Bob']
    },
    {
        Object: [
            new Map<string, any>([
                ['one', {
                    Three: [0, 1, 2, 3, new Map<string, any>([['04', [0, 4]]]), 5, 6, 7, 8, 9]
                }]
            ]),
            {
                Two: new Map<string, any>([
                    ['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]
                ])
            },
            [
                new Map<string, any>([
                    ['Three', [0, 1, 2, 3, {
                        TwentyFour: 24
                    }, 5, 6, 7, 8, 9]]
                ])
            ]
        ],
        Path: '$..Three[::2][\'TwentyFour\',\'04\']',
        Expected: [[0, 4], 24]
    },
    {
        Object: [
            new Map<string, any>([
                ['one', {
                    Three: [0, 1, 2, 3, new Map<string, any>([
                        ['04', '04']
                    ]), 5, 6, 7, 8, 9]
                }]
            ]),
            {
                Two: new Map<string, any>([
                    ['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]
                ])
            },
            [
                new Map<string, any>([
                    ['Three', [
                        0, 1, 2, 3, {TwentyFour: 24}, 5, 6, 7, 8, 9
                    ]]
                ])
            ]
        ],
        Path: '$..Three[::2][\'TwentyFour\',\'04\']',
        Expected: ['04', 24]
    },
    {
        Object: [
            new Map<string, any>([
                ['one', {
                    Three: [0, 1, 2, 3, new Map<string, any>([
                        ['04', '04']
                    ]), 5, 6, 7, 8, 9]
                }]
            ]),
            {
                Two: new Map<string, any>([
                    ['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]
                ])
            },
            [
                new Map<string, any>([
                    ['Three', [
                        0, 1, 2, 3, [{TwentyFour: 24}], 5, 6, 7, 8, 9
                    ]]
                ])
            ]
        ],
        Path: '$..Three[::2]..TwentyFour',
        Expected: [24]
    },
    {
        Object: new Map<string, any>([
            ['child', [
                undefined,
                new Map<string, any>([
                    ['nectar', {
                        willy: [
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
                        ],
                        two: [1, 2, 3, 4, 5]
                    }],
                    ['mocha', {
                        Nacho: 'cheese',
                        Amount: 45.56
                    }]
                ]),
                null,
                undefined,
                'another child'
            ]]
        ]),
        Path: '$.child[20].wind',
        Expected: []
    },
    {
        Object: new Map<string, any>([
            ['child', [
                undefined,
                new Map<string, any>([
                    ['nectar', {
                        willy: [
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
                        ],
                        two: [1, 2, 3, 4, 5]
                    }],
                    ['mocha', {
                        Nacho: 'cheese',
                        Amount: 45.56
                    }]
                ]),
                null,
                undefined,
                'another child'
            ]]
        ]),
        Path: '$.child[1].nectar.two[*]',
        Expected: [1, 2, 3, 4, 5]
    }
]