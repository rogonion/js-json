# js-json

A library for manipulating dynamic, JSON-like data structures in JavaScript. It provides tools for traversing, modifying, validating, and converting deeply nested objects (maps, sets, arrays, classes) using JSONPath.

## Features

- **Dynamic Object Manipulation**: Get, Set, Delete, and Iterate over values in deeply nested structures using JSONPath.
- **Schema Validation**: Define schemas for your data and validate dynamic objects against them at runtime.
- **Type Conversion**: Convert loosely typed data (e.g., `Record<string, any>`) into strongly typed structures (classes, maps, sets) based on schema definitions.
- **Deserialization**: Helpers for loading JSON and YAML data directly into schema-validated structures.
- **JSONPath Support**: Supports dot notation, recursive descent (`..`), wildcards (`*`), unions (`['a','b']`), and array slicing (`[start:end:step]`).

## Prerequisites

<table>
  <thead>
    <tr>
      <th>Tool</th>
      <th>Description</th>
      <th>Link</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Node.js</td>
      <td>JavaScript runtime.</td>
      <td><a href="https://nodejs.org/">Official Website</a></td>
    </tr>
    <tr>
      <td>Task</td>
      <td>
        <p>Task runner / build tool.</p> 
        <p>You can use the provided shell script <a href="taskw">taskw</a> that automatically downloads the binary and installs it in the <code>.task</code> folder.</p>
      </td>
      <td><a href="https://taskfile.dev/">Official Website</a></td>
    </tr>
    <tr>
      <td>Docker / Podman</td>
      <td>Optional container engine for isolated development environment.</td>
      <td><a href="https://www.docker.com/">Docker</a> / <a href="https://podman.io/">Podman</a></td>
    </tr>
  </tbody>
</table>

## Installation

```shell
npm install @rogonion/js-json
```

## Environment Setup

This project uses `Taskfile` to manage the development environment and tasks.

The below command lists all tasks available in the project:

```shell
TASK="./taskw"

$TASK --list
```

<table>
  <thead>
    <tr>
      <th>Task</th>
      <th>Description</th>
      <th>Usage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>env:build</code></td>
      <td>
        <p>Build the dev container image.</p>
        <p>Image runs an ssh server one can connect to with vscode.</p>
      </td>
      <td><code>task env:build</code></td>
    </tr>
    <tr>
      <td><code>env:info</code></td>
      <td>Show current environment configuration.</td>
      <td><code>task env:info</code></td>
    </tr>
    <tr>
      <td><code>deps</code></td>
      <td>Download and tidy dependencies.</td>
      <td><code>task deps</code></td>
    </tr>
    <tr>
      <td><code>test</code></td>
      <td>Run tests.</td>
      <td><code>task test</code></td>
    </tr>
    <tr>
      <td><code>format</code></td>
      <td>Format code.</td>
      <td><code>task format</code></td>
    </tr>
    <tr>
      <td><code>build</code></td>
      <td>Compile into <code>dist</code> folder.</td>
      <td><code>task build</code></td>
    </tr>
  </tbody>
</table>

## Modules

### 1. Object

The `object` module is the core of the library, allowing you to manipulate data structures.

**Key Capabilities:**

- `Get`: Retrieve values.
- `Set`: Update or insert values (auto-creates nested structures if schema is provided).
- `Delete`: Remove values.
- `ForEach`: Iterate over matches.
- `AreEqual`: Deep comparison.

**Example:**

```typescript
import { JSObject } from 'js-json';

const data = {
    users: [
        { name: 'Alice', id: 1 },
        { name: 'Bob', id: 2 }
    ]
};

const obj = new JSObject();
obj.Source = data;

// Get
const noOfResults = obj.Get('$.users[0].name');
if (noOfResults > 0) {
    console.log(obj.ValueFound); // Output: Alice
}

// Set
obj.Set('$.users[1].active', true);

// Delete
obj.Delete('$.users[0]');
```

### 2. Schema

The `schema` module allows you to define the expected structure of your data. This is useful for validation and conversion of dynamic data.

**Example: Validation**

```typescript
import { DynamicSchemaNode, DataKind, Validation } from 'js-json';

// Define a schema
const userSchema = new DynamicSchemaNode({
    Kind: DataKind.Object,
    ChildNodes: {
        Name: new DynamicSchemaNode({ Kind: DataKind.String }),
        Age: new DynamicSchemaNode({ Kind: DataKind.Number })
    }
});

const validator = new Validation();
const data = { Name: 'Alice', Age: 30 };

// Validate
const ok = validator.ValidateData(data, userSchema);
```

**Example: Conversion**

```typescript
import { DynamicSchemaNode, DataKind, Conversion } from 'js-json';

// Define schema (same as above)
// ...

const source = { Name: 'Alice', Age: '30' }; // Age is string in source

const converter = new Conversion();
// Converts and coerces types (string "30" -> number 30)
const dest = converter.Convert(source, userSchema);
```

### 3. Path

The `path` module handles parsing of JSONPath strings. It is primarily used internally by the `object` module but can be used directly to inspect paths.

```typescript
import { Parse } from 'js-json';

const segments = Parse('$.store.book[*].author');
```

## Supported Data Types

The library supports manipulation of:

- **Primitives**: `string`, `number`, `boolean`, `bigint`, `symbol`.
- **Collections**: `Map`, `Set`, `Array`, `Object` (classes).
- **Any**: `any`.
