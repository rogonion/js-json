import { describe, it, expect } from 'vitest';
import { AreEqual, type Equal } from '@object';

describe('AreEqual', () => {
    const checker = new AreEqual();

    it('should compare primitives', () => {
        expect(checker.AreEqual(1, 1)).toBe(true);
        expect(checker.AreEqual(1, 2)).toBe(false);
        expect(checker.AreEqual('a', 'a')).toBe(true);
        expect(checker.AreEqual('a', 'b')).toBe(false);
        expect(checker.AreEqual(true, true)).toBe(true);
        expect(checker.AreEqual(true, false)).toBe(false);
        expect(checker.AreEqual(null, null)).toBe(true);
        expect(checker.AreEqual(undefined, undefined)).toBe(true);
        expect(checker.AreEqual(null, undefined)).toBe(false);
    });

    it('should compare arrays', () => {
        expect(checker.AreEqual([], [])).toBe(true);
        expect(checker.AreEqual([1, 2], [1, 2])).toBe(true);
        expect(checker.AreEqual([1, 2], [1, 3])).toBe(false);
        expect(checker.AreEqual([1, 2], [1, 2, 3])).toBe(false);
        expect(checker.AreEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    });

    it('should compare objects', () => {
        expect(checker.AreEqual({}, {})).toBe(true);
        expect(checker.AreEqual({ a: 1 }, { a: 1 })).toBe(true);
        expect(checker.AreEqual({ a: 1 }, { a: 2 })).toBe(false);
        expect(checker.AreEqual({ a: 1 }, { b: 1 })).toBe(false);
        expect(checker.AreEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    });

    it('should compare maps', () => {
        const m1 = new Map([
            ['a', 1],
            ['b', 2]
        ]);
        const m2 = new Map([
            ['a', 1],
            ['b', 2]
        ]);
        const m3 = new Map([
            ['a', 1],
            ['b', 3]
        ]);

        expect(checker.AreEqual(m1, m2)).toBe(true);
        expect(checker.AreEqual(m1, m3)).toBe(false);
        expect(checker.AreEqual(new Map(), new Map())).toBe(true);
    });

    it('should compare sets', () => {
        const s1 = new Set([1, 2, 3]);
        const s2 = new Set([3, 2, 1]); // Order shouldn't matter
        const s3 = new Set([1, 2]);

        expect(checker.AreEqual(s1, s2)).toBe(true);
        expect(checker.AreEqual(s1, s3)).toBe(false);
        expect(checker.AreEqual(new Set(), new Set())).toBe(true);
    });

    it('should compare sets with objects', () => {
        const s1 = new Set([{ a: 1 }, { b: 2 }]);
        const s2 = new Set([{ b: 2 }, { a: 1 }]);
        const s3 = new Set([{ a: 1 }, { b: 3 }]);

        expect(checker.AreEqual(s1, s2)).toBe(true);
        expect(checker.AreEqual(s1, s3)).toBe(false);
    });

    it('should compare Dates', () => {
        const d1 = new Date('2023-01-01');
        const d2 = new Date('2023-01-01');
        const d3 = new Date('2023-01-02');

        expect(checker.AreEqual(d1, d2)).toBe(true);
        expect(checker.AreEqual(d1, d3)).toBe(false);
    });

    it('should compare RegExps', () => {
        const r1 = /abc/g;
        const r2 = /abc/g;
        const r3 = /abc/i;

        expect(checker.AreEqual(r1, r2)).toBe(true);
        expect(checker.AreEqual(r1, r3)).toBe(false);
    });

    it('should handle mixed types correctly', () => {
        expect(checker.AreEqual([], {})).toBe(false);
        expect(checker.AreEqual({}, [])).toBe(false);
        expect(checker.AreEqual(new Map(), {})).toBe(false);
        expect(checker.AreEqual(new Set(), [])).toBe(false);

        // Array vs Object with same keys/values
        const arr = ['a'];
        const obj = { 0: 'a' };
        expect(checker.AreEqual(arr, obj)).toBe(false);
    });

    it('should handle nested complex structures', () => {
        const o1 = {
            users: [{ id: 1, meta: new Map([['active', true]]) }],
            tags: new Set(['admin', 'editor'])
        };
        // Deep clone logic simulation
        const o2 = {
            users: [{ id: 1, meta: new Map([['active', true]]) }],
            tags: new Set(['editor', 'admin'])
        };
        expect(checker.AreEqual(o1, o2)).toBe(true);
    });

    it('should use custom equality checker', () => {
        class User {
            constructor(
                public id: number,
                public name: string
            ) {}
        }

        const customChecker: Equal = {
            AreEqual: (a: any, b: any) => a.id === b.id
        };

        const custom = new AreEqual({ User: customChecker });

        const u1 = new User(1, 'Alice');
        const u2 = new User(1, 'Bob'); // Same ID, should be equal per custom checker
        const u3 = new User(2, 'Alice');

        expect(custom.AreEqual(u1, u2)).toBe(true);
        expect(custom.AreEqual(u1, u3)).toBe(false);
    });
});
