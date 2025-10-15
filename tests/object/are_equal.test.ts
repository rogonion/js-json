import type {TestData} from '@internal'
import {describe, expect, it} from 'vitest'
import {AreEqual, type AreEquals} from '@object'
import {JSONstringify} from '@core'
import {User} from '../misc.ts'


describe('are_equal', () => {
    it.each(TestData)('Expected to return $Expected', (testData) => {
        try {
            expect(new AreEqual(testData.AreEquals).AreEqual(testData.Left, testData.Right, testData.MatchOrderOfObjectKeys, testData.NullsAndUndefinedSameType)).toBe(testData.Expected)
        } catch (e) {
            console.log(
                'Left', JSONstringify(testData.Left), '\n',
                'Right', JSONstringify(testData.Right)
            )
            throw e
        }
    })
})

interface AreEqualData extends TestData {
    Left: any
    Right: any
    Expected: boolean
    MatchOrderOfObjectKeys: boolean
    NullsAndUndefinedSameType: boolean
    AreEquals?: AreEquals
}

const TestData: AreEqualData[] = [
    {
        Left: {one: 1, two: 2, three: 3, four: [{one: 2, three: 45}]},
        Right: {one: 1, two: 2, three: 3, four: [{one: 2, three: 45}]},
        Expected: true,
        MatchOrderOfObjectKeys: false,
        NullsAndUndefinedSameType: true
    },
    {
        Left: {one: 1, two: 2, three: 3, four: [{one: 2, three: 45}]},
        Right: {one: 1, three: 3, four: [{three: 45, one: 2}], two: 2},
        Expected: true,
        MatchOrderOfObjectKeys: false,
        NullsAndUndefinedSameType: true
    },
    {
        Left: {one: 1, two: 2, three: 3, four: [{one: 2, three: 45}, null]},
        Right: {one: 1, three: 3, four: [{three: 45, one: 2}], two: 2},
        Expected: false,
        MatchOrderOfObjectKeys: false,
        NullsAndUndefinedSameType: true
    },
    {
        Left: {one: 1, two: 2, three: 3, four: [{one: 2, three: 45}]},
        Right: {one: 1, three: 3, four: [{three: 45, one: 2}], two: 2},
        Expected: false,
        MatchOrderOfObjectKeys: true,
        NullsAndUndefinedSameType: false
    },
    {
        Left: new Map<any, any>([
            [1, {
                1: new Set<any>([1, 2, 3])
            }],
            ['2', {
                2: new Set<any>([3, 2, 1])
            }],
            [true, {
                '3': {one: 1, three: 3, four: [{three: 45, one: 2}], two: 2}
            }]
        ]),
        Right: new Map<any, any>([
            [true, {
                3: {one: 1, three: 3, four: [{three: 45, one: 2}], two: 2}
            }],
            [1, {
                1: new Set<any>([3, 2, 1])
            }],
            ['2', {
                2: new Set<any>([1, 2, 3])
            }]
        ]),
        Expected: true,
        MatchOrderOfObjectKeys: false,
        NullsAndUndefinedSameType: false
    },
    {
        Left: (() => {
            const x = new User()
            x.ID = 1
            x.Name = 'John Doe'
            x.Email = 'john.doe@email.com'
            return x
        })(),
        Right: (() => {
            const x = new User()
            x.ID = 1
            x.Name = 'John Doe'
            x.Email = 'john.doe@email.com'
            return x
        })(),
        Expected: true,
        MatchOrderOfObjectKeys: true,
        NullsAndUndefinedSameType: true
    },
    {
        Left: {
            'ID': '1',
            'Name': 'John Doe',
            'Email': 'john.doe@email.com'
        },
        Right: (() => {
            const x = new User()
            x.ID = 1
            x.Name = 'John Doe'
            x.Email = 'john.doe@email.com'
            return x
        })(),
        Expected: false,
        MatchOrderOfObjectKeys: false,
        NullsAndUndefinedSameType: true
    }
]