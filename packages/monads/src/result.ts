export type Result<T, E> = Ok<T> | Err<E>;

export interface Ok<T> {
	readonly variant: "ok";
	readonly value: T;
}

export interface Err<E> {
	readonly variant: "error";
	readonly error: E;
}

export const Ok = <T>(value: T): Ok<T> => ({ variant: "ok", value });
export const Err = <E>(error: E): Err<E> => ({ variant: "error", error });

export const Result = {
	Ok,
	Err,
	isOk,
	isError,
	map,
	mapError,
	match,
} as const;

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
	return result.variant === "ok";
}

export function isError<T, E>(result: Result<T, E>): result is Err<E> {
	return result.variant === "error";
}

export function map<T, E, U>(
	result: Result<T, E>,
	mapper: (value: T) => U,
): Result<U, E> {
	if (isOk(result)) {
		return Ok(mapper(result.value));
	}

	return result;
}

export function mapError<T, E, F>(
	result: Result<T, E>,
	mapper: (error: E) => F,
): Result<T, F> {
	if (isError(result)) {
		return Err(mapper(result.error));
	}

	return result;
}

export function match<T, E, R>(
	result: Result<T, E>,
	patterns: {
		ok: (value: T) => R;
		error: (error: E) => R;
	},
): R {
	if (isOk(result)) {
		return patterns.ok(result.value);
	}

	return patterns.error(result.error);
}
