import type {TestData} from '@internal'
import type {JSONPath} from '@path'
import {describe, expect, it} from 'vitest'
import {AreEqual, GetValue, type GetObjectResult} from '@object'
import {JSONstringify} from '@core'
import {ComplexData} from '../misc.ts'

describe('get', () => {
    it.each(TestData)('$Path expected to run successfully? $ExpectedOk', (testData) => {
        let res: GetObjectResult | undefined
        try {
            res = new GetValue().Get(testData.Root, testData.Path)
            expect(new AreEqual().AreEqual(res.Result, testData.ExpectedValue, false, true)).toBe(testData.ExpectedOk)
        } catch (e) {
            if (testData.ExpectedOk) {
                console.log(
                    'Path=', testData.Path, '\n',
                    'Result=', JSONstringify(res ? res.Result : undefined), '\n',
                    'Expected=', JSONstringify(testData.ExpectedValue), '\n',
                    'Path=', testData.Path
                )
                throw e
            }
        }
    })
})

interface GetData extends TestData {
    Root: any
    Path: JSONPath
    ExpectedOk: boolean
    ExpectedValue: any
}

const TestData: GetData[] = [
    {
        Root: new Map<string, any>([
            ['data', new Map<string, any>([
                ['metadata', {
                    Address: {
                        Street: '123 Main St',
                        City: 'Anytown'
                    },
                    Status: 'active'
                }]
            ])]
        ]),
        Path: '$.data.metadata.Address.City',
        ExpectedOk: true,
        ExpectedValue: 'Anytown'
    },
    {
        Root: new Set<any>([
            new Map<string, any>([
                ['User', {Name: 'Alice'}]
            ]),
            {
                Items: [
                    {Name: 'Item 1'},
                    {Name: 'Item 2'}
                ],
                User: {Name: 'Bob'}
            }
        ]),
        Path: '$..Name',
        ExpectedOk: true,
        ExpectedValue: ['Alice', 'Item 1', 'Item 2', 'Bob']
    },
    {
        Root: (() => {
            const x = new ComplexData()
            x.ID = 99
            x.User.ID = 10
            x.User.Name = 'Charlie'
            x.User.Email = 'charlie@example.com'
            return x
        })(),
        Path: '$.User[\'ID\', \'Name\']',
        ExpectedOk: true,
        ExpectedValue: [10, 'Charlie']
    },
    {
        Root: (() => {
            const x = new ComplexData()
            x.Items = [
                {Name: 'First', Value: 10},
                {Name: 'Second', Value: 20},
                {Name: 'Third', Value: 30}
            ]
            return x
        })(),
        Path: '$.Items[1].Value',
        ExpectedOk: true,
        ExpectedValue: 20
    },
    {
        Root: {
            'store': new Map<string, string>([['book', 'fiction']])
        },
        Path: '$.store.magazine',
        ExpectedOk: false,
        ExpectedValue: undefined
    },
    {
        Root: new Set<any>([
            new Map<string, any>([
                ['one', {
                    Three: [0, 1, 2, 3, {['04']: [0, 4]}, 5, 6, 7, 8, 9]
                }]
            ]),
            {
                Two: new Map<string, any>([
                    ['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]
                ])
            },
            new Set<any>([
                new Map<string, any>([
                    ['Three', [0, 1, 2, 3, {TwentyFour: 24}, [5, 6, 7, 8, 9]]]
                ])
            ])
        ]),
        Path: '$..Three[::2][\'TwentyFour\',\'04\']',
        ExpectedOk: true,
        ExpectedValue: [[0, 4], 24]
    },
    {
        Root: new Set<any>([
            new Map<string, any>([
                ['one', {
                    Three: [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]
                }]
            ]),
            {
                Two: new Map<string, any>([
                    ['Three', [0, 1, 2, 3, {['04']: '04'}, 5, 6, 7, 8, 9]]
                ])
            },
            new Set<any>([
                new Map<string, any>([
                    ['Three', [0, 1, 2, 3, {TwentyFour: 24}, [5, 6, 7, 8, 9]]]
                ])
            ])
        ]),
        Path: '$..Three[::2][\'TwentyFour\',\'04\']',
        ExpectedOk: true,
        ExpectedValue: ['04', 24]
    },
    {
        Root: new Set<any>([
            new Map<string, any>([
                ['one', {
                    Three: [0, 1, 2, 3, {['04']: [0, 4]}, 5, 6, 7, 8, 9]
                }]
            ]),
            {
                Two: new Map<string, any>([
                    ['Three', [0, 1, 2, 3, [4], 5, 6, 7, 8, 9]]
                ])
            },
            new Set<any>([
                new Map<string, any>([
                    ['Three', [0, 1, 2, 3, {TwentyFour: 24}, [5, 6, 7, 8, 9]]]
                ])
            ])
        ]),
        Path: '$..Three[::2]..TwentyFour',
        ExpectedOk: true,
        ExpectedValue: [24]
    },
    {
        Root: new Map<string, any>([
            ['one', [
                1,
                {Two: [12]},
                new Map<string, any>([
                    ['three', ['four']]
                ]),
                {
                    'five': [new Map<string, any>([
                        ['Two', [13]]
                    ])]
                }
            ]
            ]
        ]),
        Path: '$.one..Two[*]',
        ExpectedOk: true,
        ExpectedValue: [12, 13]
    },
    {
        Root: [
            {
                Five: 'five',
                Six: '0_six'
            },
            {
                Five: 'five',
                Seven: 'seven'
            },
            new Map<string, string>([
                ['Five', 'five'],
                ['Six', '2_six']
            ])
        ],
        Path: '$..Six',
        ExpectedOk: true,
        ExpectedValue: ['0_six', '2_six']
    },
    {
        Root: {
            'one': 1,
            'two': 2,
            'three': ['four', new Map<number, number>([[1, 1], [2, 2]])]
        },
        Path: '$.three[1].[\'1\']',
        ExpectedOk: true,
        ExpectedValue: 1
    }
]