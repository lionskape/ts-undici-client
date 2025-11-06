import type { ZodIssue } from "zod";

type HttpClientErrorCode =
	| "schema_validation_error"
	| "request_failed"
	| "invalid_response_body"
	| "unexpected_status"
	| "request_aborted"
	| "not_implemented";

export interface ValidationDetail {
	field: string;
	message: string;
	schema?: string;
	issue?: ZodIssue;
}

export class HttpClientError extends Error {
	public readonly code: HttpClientErrorCode;

	public readonly status?: number;

	public readonly validationDetails?: ValidationDetail[];

	public constructor(
		message: string,
		options: {
			code: HttpClientErrorCode;
			cause?: unknown;
			status?: number;
			validationDetails?: ValidationDetail[];
		},
	) {
		super(message, { cause: options.cause });
		this.name = "HttpClientError";
		this.code = options.code;
		this.status = options.status;
		this.validationDetails = options.validationDetails;
	}
}

export function createValidationDetails(
	issues: ZodIssue[],
	schemaName: string,
): ValidationDetail[] {
	return issues.map((issue) => ({
		field: issue.path.join("."),
		message: issue.message,
		schema: schemaName,
		issue,
	}));
}
