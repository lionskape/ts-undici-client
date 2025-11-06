import { describe, expect, it } from "vitest";
import { createResult } from "../src/result.js";

describe("Integration with HTTP client", () => {
	it("should integrate with http-client types", () => {
		// Simulating what an HTTP client method might return
		type ApiSchemas = {
			200: { success: true; data: string[] };
			400: { success: false; errors: string[] };
			500: { success: false; error: string };
		};

		function simulateApiCall(statusCode: 200 | 400 | 500) {
			switch (statusCode) {
				case 200:
					return createResult<ApiSchemas>(
						200,
						{ success: true, data: ["item1", "item2"] },
						{ "x-request-id": "123" },
					);
				case 400:
					return createResult<ApiSchemas>(
						400,
						{ success: false, errors: ["validation error"] },
						{ "x-request-id": "123" },
					);
				case 500:
					return createResult<ApiSchemas>(
						500,
						{ success: false, error: "internal error" },
						{ "x-request-id": "123" },
					);
			}
		}

		// Test 200 response
		const result200 = simulateApiCall(200);
		const data200 = result200.match({
			200: ({ data }) => data.data,
			400: ({ data }) => {
				throw new Error(`Validation error: ${data.errors.join(", ")}`);
			},
			500: ({ data }) => {
				throw new Error(`Server error: ${data.error}`);
			},
		});
		expect(data200).toEqual(["item1", "item2"]);

		// Test 400 response
		const result400 = simulateApiCall(400);
		expect(() => {
			result400.match({
				200: ({ data }) => data.data,
				400: ({ data }) => {
					throw new Error(`Validation error: ${data.errors.join(", ")}`);
				},
				500: ({ data }) => {
					throw new Error(`Server error: ${data.error}`);
				},
			});
		}).toThrow("Validation error: validation error");

		// Test 500 response
		const result500 = simulateApiCall(500);
		expect(() => {
			result500.match({
				200: ({ data }) => data.data,
				400: ({ data }) => {
					throw new Error(`Validation error: ${data.errors.join(", ")}`);
				},
				500: ({ data }) => {
					throw new Error(`Server error: ${data.error}`);
				},
			});
		}).toThrow("Server error: internal error");
	});

	it("should work with opaque metadata from http-client", () => {
		type Schemas = { 200: { id: string } };
		type OpaqueData = {
			requestId: string;
			serviceName: string;
			timing: { startTime: number; endTime: number };
		};

		const opaque: OpaqueData = {
			requestId: "req-123",
			serviceName: "user-service",
			timing: { startTime: 1000, endTime: 2000 },
		};

		const result = createResult<Schemas, OpaqueData>(
			200,
			{ id: "user-1" },
			{ "content-type": "application/json" },
			opaque,
		);

		const { id, metadata } = result.match({
			200: ({ data, opaque: opaqueData }) => ({
				id: data.id,
				metadata: opaqueData,
			}),
		});

		expect(id).toBe("user-1");
		expect(metadata?.requestId).toBe("req-123");
		expect(metadata?.serviceName).toBe("user-service");
		expect(metadata?.timing.endTime - metadata?.timing.startTime).toBe(1000);
	});

	it("should support early returns in handlers", () => {
		type Schemas = {
			200: { value: number };
			404: { message: string };
		};

		function processResult(statusCode: 200 | 404): number | null {
			const result =
				statusCode === 200
					? createResult<Schemas>(200, { value: 42 }, {})
					: createResult<Schemas>(404, { message: "Not found" }, {});

			const value = result.match({
				200: ({ data }) => data.value,
				404: () => null,
			});

			return value;
		}

		expect(processResult(200)).toBe(42);
		expect(processResult(404)).toBeNull();
	});
});
