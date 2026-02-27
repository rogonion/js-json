/**
 * Package object provides a set of methods for manipulating dynamic objects using JSONPath.
 *
 * It is designed to work with data structures where the type might not be known at compile time (e.g., `any`, `Record<string, any>`) or deeply nested structures (classes, arrays, maps).
 *
 * Key features:
 * - **Get**: Retrieve values from an object using a JSONPath query.
 * - **Set**: Create or update values at a specific JSONPath. Supports auto-creation of nested structures if a Schema is provided.
 * - **Delete**: Remove values at a specific JSONPath.
 * - **ForEach**: Iterate over all values matching a JSONPath query.
 * - **AreEqual**: Deep equality check with support for custom equality handlers.
 *
 * # Core Concepts
 *
 * - **{@link JSObject}**: The main entry point. It wraps the source data and provides methods to manipulate it.
 *
 * # Usage
 *
 * To begin:
 *
 * 1. Create an instance of the {@link JSObject} class.
 *
 * The following properties can be set before calling the manipulation methods:
 * - {@link JSObject.Source} - Mandatory. This is the root object to work with.
 * - {@link JSObject.DefaultConverter} - Mandatory for {@link JSObject.Set}. Module to use when converting value to set to the destination type at JSONPath.
 * - {@link JSObject.Schema} - Optional but useful for {@link JSObject.Set}. Used to determine the new collections (especially classes) to create in the nested object.
 *
 * 2. Once the Object has been successfully initialized, you can begin calling the manipulation methods: {@link JSObject.Get}, {@link JSObject.Set}, {@link JSObject.Delete}, and {@link JSObject.ForEach}, which will work on the same {@link JSObject.Source}.
 *
 * 3. Once you are satisfied, you can access the {@link JSObject.Source} property to retrieve the modified source especially if changed using {@link JSObject.Set} or {@link JSObject.Delete}.
 *
 * @example
 * ```typescript
 * import { JSObject } from '@object';
 *
 * class Address {
 *     Street: string = "";
 *     City: string = "";
 *     ZipCode?: string;
 * }
 *
 * const source = {
 *     data: {
 *         metadata: {
 *             Address: {
 *                 Street: "123 Main St",
 *                 City: "Anytown"
 *             },
 *             Status: "active"
 *         }
 *     }
 * };
 *
 * const objManip = new JSObject();
 * objManip.Source = source;
 *
 * const noOfResults = objManip.Get("$.data.metadata.Address.City");
 * let valueFound: any;
 * if (noOfResults > 0) {
 *     // retrieve value found if no of results is greater than 0
 *     valueFound = objManip.ValueFound;
 * }
 *
 * let noOfModifications = objManip.Set("$.data.metadata.Status", "inactive");
 *
 * noOfModifications = objManip.Delete("$.data.metadata.Status");
 *
 * // retrieve modified source after Set/Delete
 * const modifiedSource = objManip.Source;
 * ```
 *
 * @packageDocumentation
 */
export * from './equal';
export * from './core';
export * from './object';
