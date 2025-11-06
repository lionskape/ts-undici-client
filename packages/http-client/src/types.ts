import type { z } from "zod";

export interface ValidationIssue {
	field: string;
	message: string;
	received?: unknown;
	schema?: string;
}

export interface OpaqueBase {
	request?: {
		serviceName: string;
		origin: string;
		path: string;
		pathTemplate?: string;
		method: string;
		requestId?: string;
	};
	timing?: {
		startTime: number;
		responseTime: number;
		totalTime?: number;
		attempts?: number;
	};
	validationDetails?: ValidationIssue[];
}

export type Opaque<TOpaqueExtra extends Record<string, unknown> = {}> =
	OpaqueBase & TOpaqueExtra;

export interface ResponseSchema {
	headersSchema?: z.ZodTypeAny;
	bodySchema?: z.ZodTypeAny;
}

export type ResponseSchemaMap = Map<number, ResponseSchema>;

export interface HttpRequestOptions<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	serviceName: string;
	origin: string;
	path: string;
	method?: string;
	headers?: Record<string, string>;
	query?: Record<string, string | number | boolean | undefined>;
	body?: unknown;
	requestHeadersSchema?: z.ZodTypeAny;
	requestBodySchema?: z.ZodTypeAny;
	querySchema?: z.ZodTypeAny;
	pathParamsSchema?: z.ZodTypeAny;
	responseSchemas?: ResponseSchemaMap;
	opaque?: Partial<OpaqueBase> & TOpaqueExtra;
}

export interface PreparedRequest<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	options: HttpRequestOptions<TResponseSchemas, TOpaqueExtra>;
	opaque: Opaque<TOpaqueExtra>;
}

export interface HttpClientResponseSnapshot {
	status: number;
	headers: Record<string, string>;
	body: unknown;
}

export interface HttpResultWithSchemas<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	status: keyof TResponseSchemas & number;
	data: TResponseSchemas[keyof TResponseSchemas & number];
	headers: Record<string, string>;
	opaque: Opaque<TOpaqueExtra>;
}

export type HttpResult<
	T,
	TOpaqueExtra extends Record<string, unknown> = {},
> = HttpResultWithSchemas<{ 200: T }, TOpaqueExtra>;

export interface HttpClientMachineContext<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	attempt: number;
	request?: HttpRequestOptions<TResponseSchemas, TOpaqueExtra>;
	prepared?: PreparedRequest<TResponseSchemas, TOpaqueExtra>;
	response?: HttpClientResponseSnapshot;
	result?: HttpResultWithSchemas<TResponseSchemas, TOpaqueExtra>;
	error?: unknown;
	cancelled?: boolean;
}

export type HttpClientMachineEvent<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> =
	| {
			type: "REQUEST";
			input: HttpRequestOptions<TResponseSchemas, TOpaqueExtra>;
	  }
	| { type: "RETRY" }
	| { type: "RESET" }
	| { type: "CANCEL" };

export interface HttpClientMachineServices<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	prepareRequest?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => Promise<PreparedRequest<TResponseSchemas, TOpaqueExtra>>;
	dispatchRequest?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => Promise<HttpClientResponseSnapshot>;
	validateResponse?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => Promise<HttpResultWithSchemas<TResponseSchemas, TOpaqueExtra>>;
	cancelRequest?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => Promise<void> | void;
}

export interface HttpClientMachineActions<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	onRequestQueued?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
		event: HttpClientMachineEvent<TResponseSchemas, TOpaqueExtra>,
	) => void;
	onSuccess?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => void;
	onFailure?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => void;
	onCancelled?: (
		context: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
	) => void;
}

export interface CreateHttpClientMachineOptions<
	TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
	TOpaqueExtra extends Record<string, unknown> = {},
> {
	id?: string;
	maxAttempts?: number;
	initialContext?: Partial<
		HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>
	>;
	services?: HttpClientMachineServices<TResponseSchemas, TOpaqueExtra>;
	actions?: HttpClientMachineActions<TResponseSchemas, TOpaqueExtra>;
}

export type HttpClientStateValue =
	| "idle"
	| "preparing"
	| "dispatching"
	| "validating"
	| "succeeded"
	| "failed"
	| "cancelled";
