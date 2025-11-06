# @ts-undici-client/monads

A Rust-style Result monad for handling HTTP responses with type-safe pattern matching.

## Features

- **Type-safe pattern matching**: Compile-time exhaustiveness checking ensures all status codes are handled
- **Union return types**: The `match` method returns a union of all possible handler return types
- **Flexible handlers**: Each status code handler can return a different type
- **Opaque metadata support**: Attach custom metadata to results

## Installation

This package is part of the `ts-undici-client` monorepo and is exported from `@ts-undici-client/http-client`.

## Usage

### Simple Case - Single Schema

```typescript
import { createResult } from "@ts-undici-client/monads";

// Define your response schemas
type UserSchema = { id: string; name: string };
type Schemas = { 200: UserSchema[] };

// Create a result
const simpleResult = createResult<Schemas>(
  200,
  [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
  ],
  { "content-type": "application/json" }
);

// Pattern match to extract data
const users = simpleResult.match({
  200: ({ data }) => data,
});

console.log("Users:", users);
// Output: Users: [{ id: "1", name: "Alice" }, { id: "2", name: "Bob" }]
```

### Complex Case - Multiple Status Codes

```typescript
import { createResult } from "@ts-undici-client/monads";

// Define different schemas for different status codes
type SuccessResponse = { id: string; amount: number };
type ValidationError = { field: string; message: string };
type ServerError = { errorCode: string };
type UnprocessableError = { reason: string };

type Schemas = {
  200: SuccessResponse;
  400: ValidationError;
  500: ServerError;
  422: UnprocessableError;
};

// Create a result (could be from an HTTP call)
const complexResult = createResult<Schemas>(
  200,
  { id: "offer-123", amount: 100000 },
  { "content-type": "application/json" }
);

// Pattern match with different return types for each status
const resultData = complexResult.match({
  200: ({ data }) => [data.id, data.amount] as const,
  400: ({ data }) => {
    console.error("Validation failed:", data.field, data.message);
    return null;
  },
  500: ({ data }) => new Error(data.errorCode),
  422: ({ data }) => {
    throw new Error("unknown response");
  },
});

// TypeScript infers the type as: readonly [string, number] | null | Error
if (!resultData) {
  return;
}
if (resultData instanceof Error) {
  console.error("Error with code:", resultData.message);
  return;
}
console.log("ID:", resultData[0], "Amount:", resultData[1]);
```

### Handling Different Status Codes

```typescript
// 400 status
const validationResult = createResult<Schemas>(
  400,
  { field: "amount", message: "Must be positive" },
  {}
);

const val = validationResult.match({
  200: ({ data }) => [data.id, data.amount] as const,
  400: ({ data }) => {
    console.error("Validation failed:", data.field, data.message);
    return null;
  },
  500: ({ data }) => new Error(data.errorCode),
  422: ({ data }) => {
    throw new Error("unknown response");
  },
});
// val is null

// 500 status
const errorResult = createResult<Schemas>(
  500,
  { errorCode: "INTERNAL_ERROR" },
  {}
);

const err = errorResult.match({
  200: ({ data }) => [data.id, data.amount] as const,
  400: ({ data }) => {
    console.error("Validation failed:", data.field, data.message);
    return null;
  },
  500: ({ data }) => new Error(data.errorCode),
  422: ({ data }) => {
    throw new Error("unknown response");
  },
});
// err is Error instance
```

## API Reference

### `Result<TStatusSchemas, TOpaqueExtra>`

A class representing an HTTP result with typed status codes.

#### Type Parameters

- `TStatusSchemas`: Record mapping status codes to response data types
- `TOpaqueExtra`: Additional opaque metadata type (optional)

#### Methods

##### `match<TMatcher>(matcher: TMatcher): MatchResult<TStatusSchemas, TMatcher>`

Pattern match on the status code and execute the corresponding handler.

- **Parameters:**
  - `matcher`: An object with a handler function for each status code
- **Returns:** Union of all possible handler return types
- **Throws:** Error if no handler is provided for the current status code

##### `getStatus(): number`

Get the HTTP status code.

##### `getData(): TStatusSchemas[keyof TStatusSchemas & number]`

Get the response data.

##### `getHeaders(): Record<string, string>`

Get the response headers.

##### `getOpaque(): TOpaqueExtra | undefined`

Get the opaque metadata.

### `createResult<TStatusSchemas, TOpaqueExtra>(status, data, headers, opaque?)`

Factory function to create a Result instance.

- **Parameters:**
  - `status`: HTTP status code (must be a key in TStatusSchemas)
  - `data`: Response data (type must match the schema for the given status)
  - `headers`: Response headers
  - `opaque`: Optional opaque metadata
- **Returns:** `Result<TStatusSchemas, TOpaqueExtra>`

## Type Safety

The `match` method uses TypeScript's type system to ensure:

1. **Exhaustiveness**: All status codes defined in `TStatusSchemas` must have a handler
2. **Type inference**: Each handler receives correctly typed data based on the status code
3. **Union return types**: The return type is a union of all handler return types (excluding `never`)

```typescript
// This will cause a TypeScript error if a handler is missing
type Schemas = { 200: string; 404: string; 500: string };
const result = createResult<Schemas>(200, "ok", {});

// ❌ TypeScript error: Property '500' is missing
result.match({
  200: ({ data }) => data,
  404: ({ data }) => data,
  // Missing 500 handler!
});

// ✅ All handlers provided
result.match({
  200: ({ data }) => data,
  404: ({ data }) => data,
  500: ({ data }) => data,
});
```

## Integration with HTTP Client

When using with `@ts-undici-client/http-client`, you can wrap HTTP responses in Result objects:

```typescript
import { createResult } from "@ts-undici-client/http-client";

async function getUsers() {
  // ... make HTTP request ...
  // Wrap the response in a Result
  return createResult<{ 200: User[] }>(200, users, headers);
}

const result = await getUsers();
const users = result.match({
  200: ({ data }) => data,
});
```
