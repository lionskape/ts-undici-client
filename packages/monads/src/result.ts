/**
 * Computes a union of all non-never return types from the matcher functions
 */
type MatchResult<
	TStatusSchemas extends Record<number, unknown>,
	TMatcher extends {
		[K in keyof TStatusSchemas]: (result: {
			data: TStatusSchemas[K];
			status: K & number;
			headers: Record<string, string>;
			opaque?: any;
		}) => any;
	},
> = {
	[K in keyof TMatcher]: TMatcher[K] extends (...args: any[]) => infer R
		? R
		: never;
}[keyof TMatcher];

/**
 * Ensures all status codes are handled in the matcher
 */
type ExhaustiveChecker<
	TStatusSchemas extends Record<number, unknown>,
	TMatcher extends Record<number, any>,
> = keyof TStatusSchemas extends keyof TMatcher ? TMatcher : never;

/**
 * Result type representing an HTTP response with typed status codes
 */
export class Result<
	TStatusSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	constructor(
		private readonly status: keyof TStatusSchemas & number,
		private readonly data: TStatusSchemas[keyof TStatusSchemas & number],
		private readonly headers: Record<string, string>,
		private readonly opaque?: TOpaqueExtra,
	) {}

	/**
	 * Pattern match on the HTTP status code and execute the corresponding handler
	 * @param matcher Object mapping status codes to handler functions
	 * @returns The return value of the matched handler
	 */
	match<
		TMatcher extends ExhaustiveChecker<
			TStatusSchemas,
			{
				[K in keyof TStatusSchemas]: (result: {
					data: TStatusSchemas[K];
					status: K & number;
					headers: Record<string, string>;
					opaque?: any;
				}) => any;
			}
		>,
	>(matcher: TMatcher): MatchResult<TStatusSchemas, TMatcher> {
		const handler = (matcher as any)[this.status];

		if (!handler) {
			throw new Error(`No handler provided for status code ${this.status}`);
		}

		return handler({
			data: this.data,
			status: this.status,
			headers: this.headers,
			opaque: this.opaque,
		});
	}

	/**
	 * Get the status code
	 */
	getStatus(): keyof TStatusSchemas & number {
		return this.status;
	}

	/**
	 * Get the response data
	 */
	getData(): TStatusSchemas[keyof TStatusSchemas & number] {
		return this.data;
	}

	/**
	 * Get the response headers
	 */
	getHeaders(): Record<string, string> {
		return this.headers;
	}

	/**
	 * Get the opaque metadata
	 */
	getOpaque(): TOpaqueExtra | undefined {
		return this.opaque;
	}
}

/**
 * Create a Result from an HTTP response
 */
export function createResult<
	TStatusSchemas extends Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
>(
	status: keyof TStatusSchemas & number,
	data: TStatusSchemas[keyof TStatusSchemas & number],
	headers: Record<string, string>,
	opaque?: TOpaqueExtra,
): Result<TStatusSchemas, TOpaqueExtra> {
	return new Result(status, data, headers, opaque);
}
