/**
 * Example usage demonstrating the monads package API
 * This matches the examples from the problem statement
 */

import { createResult } from "../src/result.js";

// Example type definitions
type User = { id: string; name: string };
type LoanOffer = { id: string; amount: number };
type ValidationError = { field: string; message: string };
type ServerError = { errorCode: string };
type UnprocessableError = { reason: string };

// Mock functions to simulate API calls
async function getV1Users() {
	// Simulating a simple 200 response
	return createResult<{ 200: User[] }>(
		200,
		[
			{ id: "1", name: "Alice" },
			{ id: "2", name: "Bob" },
		],
		{ "content-type": "application/json" },
	);
}

async function postV1LoanOfferProduce(params: {
	pathParams: { offerId: string };
	body: { amount: number };
}) {
	// Simulating different response types based on business logic
	if (params.body.amount < 0) {
		return createResult<{
			200: LoanOffer;
			400: ValidationError;
			500: ServerError;
			422: UnprocessableError;
		}>(400, { field: "amount", message: "Amount must be positive" }, {});
	}

	if (params.body.amount > 1000000) {
		return createResult<{
			200: LoanOffer;
			400: ValidationError;
			500: ServerError;
			422: UnprocessableError;
		}>(500, { errorCode: "AMOUNT_TOO_LARGE" }, {});
	}

	return createResult<{
		200: LoanOffer;
		400: ValidationError;
		500: ServerError;
		422: UnprocessableError;
	}>(200, { id: params.pathParams.offerId, amount: params.body.amount }, {});
}

// Example 1: Simple case - one schema for successful response
async function example1() {
	console.log("=== Example 1: Simple Case ===");

	const simpleResult = await getV1Users();
	const users = simpleResult.match({ 200: ({ data }) => data });
	console.log("Users:", users);
}

// Example 2: Complex case - different schemas for different status codes
async function example2() {
	console.log("\n=== Example 2: Complex Case (Success) ===");

	const complexResult = await postV1LoanOfferProduce({
		pathParams: { offerId: "offer-123" },
		body: { amount: 100000 },
	});

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

	if (!resultData) {
		return;
	}
	if (resultData instanceof Error) {
		console.error("Error with code:", resultData.message);
		return resultData;
	}
	console.log("ID:", resultData[0]);
	console.log("Amount:", resultData[1]);
}

// Example 3: Handling validation error (400)
async function example3() {
	console.log("\n=== Example 3: Validation Error (400) ===");

	const complexResult = await postV1LoanOfferProduce({
		pathParams: { offerId: "offer-456" },
		body: { amount: -1000 },
	});

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

	if (!resultData) {
		console.log("Result is null due to validation error");
		return;
	}
}

// Example 4: Handling server error (500)
async function example4() {
	console.log("\n=== Example 4: Server Error (500) ===");

	const complexResult = await postV1LoanOfferProduce({
		pathParams: { offerId: "offer-789" },
		body: { amount: 2000000 },
	});

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

	if (!resultData) {
		return;
	}
	if (resultData instanceof Error) {
		console.error("Error with code:", resultData.message);
		return resultData;
	}
}

// Run all examples
async function main() {
	await example1();
	await example2();
	await example3();
	await example4();

	console.log("\n=== All examples completed successfully! ===");
}

main().catch((err) => {
	console.error("Error running examples:", err);
	process.exit(1);
});
