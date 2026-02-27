import { IsArray, IsDefined, IsMap, IsObject, IsSet } from '@core';

/**
 * Defin custom equal check logic.
 *
 * Meant to be implemented by custom data types that need to perform specific value-based equality checks beyond defaults.
 */
export interface Equal {
    /**
     * @param left
     * @param right
     * @returns `true` if {@link left} and {@link right} are equal.
     */
    AreEqual(left: any, right: any): boolean;
}

/**
 * An object of custom equality checkers.
 *
 * Works only for user-defined classes as the key is expected to be the constuctor's name.
 */
export type AreEquals = { [key: string]: Equal };

/**
 * Performs a deep equality check between two values.
 *
 * Supports Primitives, Arrays, Maps, Sets, Dates, RegExp and Objects.
 */
export class AreEqual implements Equal {
    private _CustomEquals: AreEquals = {};
    public set CustomEquals(customEquals: AreEquals) {
        this._CustomEquals = customEquals;
    }

    private _NullsAndUndefinedSameType: boolean = false;
    public set NullsAndUndefinedSameType(value: boolean) {
        this._NullsAndUndefinedSameType = value;
    }

    private _MatchOrderOfKeys: boolean = false;
    public set MatchOrderOfKeys(value: boolean) {
        this._MatchOrderOfKeys = value;
    }

    constructor(
        customEquals?: AreEquals,
        nullsAndUndefinedSameType: boolean = false,
        matchOrderOfKeys: boolean = false
    ) {
        if (customEquals) {
            this._CustomEquals = customEquals;
        }
        this._NullsAndUndefinedSameType = nullsAndUndefinedSameType;
        this._MatchOrderOfKeys = matchOrderOfKeys;
    }

    /**
     * Recursively checks if {@link left} and {@link right} are equal.
     *
     * Actively check if Arrays, Maps, Sets, Date, RegExp, and Plain Old JavaScript Object's properties are equal.
     *
     * @param left
     * @param right
     * @returns
     */
    public AreEqual(left: any, right: any): boolean {
        if (typeof left !== typeof right) {
            if (this._NullsAndUndefinedSameType) {
                if (!IsDefined(left) && !IsDefined(right)) {
                    return true;
                }
            }
            return false;
        }

        if (IsObject(left)) {
            if (left === null) {
                return right === null;
            }

            if (left.constructor.name !== right.constructor.name) {
                return false;
            }

            {
                const name = left.constructor.name;
                if (name in this._CustomEquals) {
                    return this._CustomEquals[name].AreEqual(left, right);
                }
            }

            if (IsArray(left)) {
                if (!IsArray(right)) return false;
                if (left.length !== right.length) return false;
                for (let i = 0; i < left.length; i++) {
                    if (!this.AreEqual(left[i], right[i])) return false;
                }
                return true;
            }

            if (IsMap(left)) {
                if (!IsMap(right)) return false;
                if (left.size !== right.size) return false;
                for (const [key, val] of left) {
                    if (!right.has(key)) return false;
                    if (!this.AreEqual(val, right.get(key))) return false;
                }
                return true;
            }

            if (IsSet(left)) {
                if (!IsSet(right)) return false;
                if (left.size !== right.size) return false;
                // Sets are unordered. Check if every element in A has a deep equal match in B.
                for (const valA of left) {
                    let found = false;
                    for (const valB of right) {
                        if (this.AreEqual(valA, valB)) {
                            found = true;
                            break;
                        }
                    }
                    if (!found) return false;
                }
                return true;
            }

            // Date
            if (left instanceof Date) {
                return right instanceof Date && left.getTime() === right.getTime();
            }
            if (right instanceof Date) return false;

            // RegExp
            if (left instanceof RegExp) {
                return right instanceof RegExp && left.toString() === right.toString();
            }
            if (right instanceof RegExp) return false;

            // POJO
            const leftObjKeys = Object.keys(left);
            const rightObjKeys = Object.keys(right);

            if (leftObjKeys.length !== rightObjKeys.length) {
                return false;
            }

            if (this._MatchOrderOfKeys) {
                for (let i = 0; i < leftObjKeys.length; i++) {
                    if (leftObjKeys[i] !== rightObjKeys[i]) {
                        return false;
                    }

                    if (!this.AreEqual((left as any)[leftObjKeys[i]], right[rightObjKeys[i]])) {
                        return false;
                    }
                }

                return true;
            }

            for (const leftObjKey of leftObjKeys) {
                let leftMatchedRight = false;

                for (const rightObjKey of rightObjKeys) {
                    if (leftObjKey === rightObjKey) {
                        leftMatchedRight = true;

                        if (!this.AreEqual((left as any)[leftObjKey], right[rightObjKey])) {
                            return false;
                        }

                        break;
                    }
                }

                if (!leftMatchedRight) {
                    return false;
                }
            }

            return true;
        }

        return left === right;
    }
}
