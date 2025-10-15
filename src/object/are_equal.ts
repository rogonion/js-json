import {IsArray, IsMap, IsNullOrUndefined, IsSet} from '@core'

/**
 * For defining custom equal check logic.
 *
 * Meant to be implemented by custom data types that need to perform specific value-based equality checks beyond defaults.
 * */
export interface Equal {
    /**
     * Checks if two values are equal.
     *
     * @function
     * @param left Value to check.
     * @param right Value to check.
     * @param matchOrderOfKeys `false` by default.
     * @param nullsAndUndefinedSameType `true` by default.
     * @returns boolean to indicate if {@linkcode left} and {@linkcode right} are equal.
     * */
    AreEqual: (left: any, right: any, matchOrderOfKeys: boolean, nullsAndUndefinedSameType: boolean) => boolean;
}

/**
 * Map of custom equal checkers with key representing unique `typeName`.
 *
 * Intended to be used for custom equality checks logic of user-defined classes where `typeName` is obtained using `class.constructor.name`.
 * */
export type AreEquals = Map<string, Equal>

/**
 * @class
 * Recursively checks if {@linkcode left} and {@linkcode right} are equal.
 *
 * Checks the following:
 * 1. The data type of each value.
 * 2. If custom {@link AreEqual} logic for the current value is found, it is executed.
 * 3. Number of elements or keys in array, set, map, and object respectively.
 * 4. Order of keys in objects and maps if `matchOrderOfKeys` param is set to true.
 * 5. If the value themselves are equal.
 * */
export class AreEqual implements Equal {
    private _customEquals: AreEquals

    constructor(equals: AreEquals = new Map<string, Equal>()) {
        this._customEquals = equals
    }

    public AreEqual(left: any, right: any, matchOrderOfKeys: boolean = false, nullsAndUndefinedSameType: boolean = false): boolean {
        if (typeof left !== typeof right) {
            if (nullsAndUndefinedSameType) {
                if (IsNullOrUndefined(left) && IsNullOrUndefined(right)) {
                    return true
                }
            }
            return false
        }

        if (typeof left === 'object') {
            if (left === null) {
                return right === null
            }

            if (left.constructor.name !== right.constructor.name) {
                return false
            }

            {
                const typeName = left.constructor.name
                if (this._customEquals.has(typeName)) {
                    return this._customEquals.get(typeName)!.AreEqual(left, right, matchOrderOfKeys, nullsAndUndefinedSameType)
                }
            }

            if (IsArray(left)) {
                if (!IsArray(right)) {
                    return false
                }

                if (left.length !== right.length) {
                    return false
                }

                for (let i = 0; i < left.length; i++) {
                    if (!this.AreEqual(left[i], right[i])) {
                        return false
                    }
                }

                return true
            }

            if (IsSet(left)) {
                if (!IsSet(right)) {
                    return false
                }

                if (left.size !== right.size) {
                    return false
                }

                const leftArray = Array.from(left)
                const rightArray = Array.from(right)
                for (let l = 0; l < leftArray.length; l++) {
                    let leftMatchedRight = false

                    for (let r = 0; r < rightArray.length; r++) {
                        if (this.AreEqual(leftArray[l], rightArray[r], matchOrderOfKeys, nullsAndUndefinedSameType)) {
                            leftMatchedRight = true
                            break
                        }
                    }

                    if (!leftMatchedRight) {
                        return false
                    }
                }
            }

            if (IsMap(left)) {
                if (!IsMap(right)) {
                    return false
                }

                const leftMap = left as Map<any, any>
                const rightMap = right as Map<any, any>
                const leftMapKeys = Array.from(leftMap.keys())
                const rightMapKeys = Array.from(rightMap.keys())

                if (leftMapKeys.length !== rightMapKeys.length) {
                    return false
                }

                if (matchOrderOfKeys) {
                    for (let i = 0; i < leftMapKeys.length; i++) {
                        const leftMapKey = leftMapKeys[i]
                        const rightMapKey = rightMapKeys[i]
                        if (leftMapKey !== rightMapKey) {
                            return false
                        }
                        if (!this.AreEqual(leftMap.get(leftMapKey), rightMap.get(rightMapKey), matchOrderOfKeys, nullsAndUndefinedSameType)) {
                            return false
                        }
                    }

                    return true
                }

                for (const [leftKey, leftValue] of leftMap) {
                    if (!this.AreEqual(leftValue, rightMap.get(leftKey), matchOrderOfKeys, nullsAndUndefinedSameType)) {
                        return false
                    }
                }

                return true
            }

            const leftObjKeys = Object.keys(left)
            const rightObjKeys = Object.keys(right)

            if (leftObjKeys.length !== rightObjKeys.length) {
                return false
            }

            if (matchOrderOfKeys) {
                for (let i = 0; i < leftObjKeys.length; i++) {
                    if (leftObjKeys[i] !== rightObjKeys[i]) {
                        return false
                    }

                    if (!this.AreEqual(left[leftObjKeys[i]], right[rightObjKeys[i]], matchOrderOfKeys, nullsAndUndefinedSameType)) {
                        return false
                    }
                }

                return true
            }

            for (const leftObjKey of leftObjKeys) {
                let leftMatchedRight = false

                for (const rightObjKey of rightObjKeys) {
                    if (leftObjKey === rightObjKey) {
                        leftMatchedRight = true

                        if (!this.AreEqual(left[leftObjKey], right[rightObjKey], matchOrderOfKeys, nullsAndUndefinedSameType)) {
                            return false
                        }

                        break
                    }
                }

                if (!leftMatchedRight) {
                    return false
                }
            }

            return true
        }

        return left === right
    }
}
