import { describe, expect, it, vi } from "vitest";
import { createResult, Result } from "../src/result.js";

describe("Result", () => {
	describe("simple case - single schema for successful response", () => {
		it("should handle 200 status with match", () => {
			type UserSchema = { id: string; name: string };
			type Schemas = { 200: UserSchema[] };

			const result = createResult<Schemas>(
				200,
				[
					{ id: "1", name: "Alice" },
					{ id: "2", name: "Bob" },
				],
				{ "content-type": "application/json" },
			);

			const users = result.match({
				200: ({ data }) => data,
			});

			expect(users).toEqual([
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			]);
		});
	});

	describe("complex case - different schemas for different status codes", () => {
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

		it("should handle 200 status", () => {
			const result = createResult<Schemas>(
				200,
				{ id: "offer-123", amount: 100000 },
				{},
			);

			const resultData = result.match({
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

			expect(resultData).toEqual(["offer-123", 100000]);
		});

		it("should handle 400 status", () => {
			const result = createResult<Schemas>(
				400,
				{ field: "amount", message: "Must be positive" },
				{},
			);

			const consoleErrorSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});

			const resultData = result.match({
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

			expect(resultData).toBeNull();
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Validation failed:",
				"amount",
				"Must be positive",
			);

			consoleErrorSpy.mockRestore();
		});

		it("should handle 500 status and return Error", () => {
			const result = createResult<Schemas>(
				500,
				{ errorCode: "INTERNAL_ERROR" },
				{},
			);

			const resultData = result.match({
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

			expect(resultData).toBeInstanceOf(Error);
			expect((resultData as Error).message).toBe("INTERNAL_ERROR");
		});

		it("should handle 422 status and throw error", () => {
			const result = createResult<Schemas>(422, { reason: "Unknown" }, {});

			expect(() => {
				result.match({
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
			}).toThrow("unknown response");
		});
	});

	describe("getters", () => {
		it("should provide access to status, data, headers, and opaque", () => {
			type Schemas = { 200: { success: boolean } };
			const opaque = { requestId: "123" };

			const result = createResult<Schemas, typeof opaque>(
				200,
				{ success: true },
				{ "x-custom": "header" },
				opaque,
			);

			expect(result.getStatus()).toBe(200);
			expect(result.getData()).toEqual({ success: true });
			expect(result.getHeaders()).toEqual({ "x-custom": "header" });
			expect(result.getOpaque()).toEqual({ requestId: "123" });
		});
	});

	describe("union return types", () => {
		it("should return union of all handler return types", () => {
			type Schemas = {
				200: { data: string };
				400: { error: string };
				500: { code: number };
			};

			const result1 = createResult<Schemas>(200, { data: "success" }, {});
			const result2 = createResult<Schemas>(400, { error: "bad request" }, {});
			const result3 = createResult<Schemas>(500, { code: 500 }, {});

			// This tests that the return type is a union
			const val1 = result1.match({
				200: () => "string value" as const,
				400: () => 42,
				500: () => true,
			});

			const val2 = result2.match({
				200: () => "string value" as const,
				400: () => 42,
				500: () => true,
			});

			const val3 = result3.match({
				200: () => "string value" as const,
				400: () => 42,
				500: () => true,
			});

			expect(val1).toBe("string value");
			expect(val2).toBe(42);
			expect(val3).toBe(true);
		});
	});
});
