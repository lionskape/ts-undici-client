import {
	createEnum,
	type EnumInstance,
	type EnumMethods,
	type EnumVariant,
} from "@ts-undici-client/enum";

type ResultFactories<T, E> = {
	readonly ok: (value: T) => { readonly value: T };
	readonly error: (error: E) => { readonly error: E };
};

type OkPayload<T> = EnumVariant<ResultFactories<T, unknown>, "ok">;
type ErrPayload<E> = EnumVariant<ResultFactories<unknown, E>, "error">;

type ResultMethods<T, E> = EnumMethods<
	ResultFactories<T, E>,
	{
		readonly isOk: (this: Result<T, E>) => boolean;
		readonly isError: (this: Result<T, E>) => boolean;
		readonly map: <U>(
			this: Result<T, E>,
			mapper: (value: T) => U,
		) => Result<U, E>;
		readonly mapError: <F>(
			this: Result<T, E>,
			mapper: (error: E) => F,
		) => Result<T, F>;
		readonly swap: (this: Result<T, E>) => Result<E, T>;
	}
>;

export type Result<T, E> = EnumInstance<
	ResultFactories<T, E>,
	ResultMethods<T, E>
>;
export type Ok<T> = Result<T, never> & OkPayload<T>;
export type Err<E> = Result<never, E> & ErrPayload<E>;

export const Result = createEnum<
	ResultFactories<unknown, unknown>,
	ResultMethods<unknown, unknown>
>(
	{
		ok: (value) => ({ value }),
		error: (error) => ({ error }),
	},
	{
		isOk<T, E>(this: Result<T, E>) {
			return this.match({
				ok: () => true,
				error: () => false,
			});
		},
		isError<T, E>(this: Result<T, E>) {
			return this.match({
				ok: () => false,
				error: () => true,
			});
		},
		map<T, E, U>(this: Result<T, E>, mapper: (value: T) => U): Result<U, E> {
			return this.match({
				ok: ({ value }: OkPayload<T>) =>
					Result.ok(mapper(value)) as unknown as Result<U, E>,
				error: ({ error }: ErrPayload<E>): Result<U, E> =>
					Result.error(error) as unknown as Result<U, E>,
			});
		},
		mapError<T, E, F>(
			this: Result<T, E>,
			mapper: (error: E) => F,
		): Result<T, F> {
			return this.match({
				ok: ({ value }: OkPayload<T>): Result<T, F> =>
					Result.ok(value) as unknown as Result<T, F>,
				error: ({ error }: ErrPayload<E>) =>
					Result.error(mapper(error)) as unknown as Result<T, F>,
			});
		},
		swap<T, E>(this: Result<T, E>): Result<E, T> {
			return this.match({
				ok: ({ value }: OkPayload<T>) =>
					Result.error(value) as unknown as Result<E, T>,
				error: ({ error }: ErrPayload<E>): Result<E, T> =>
					Result.ok(error) as unknown as Result<E, T>,
			});
		},
	},
);

export const Ok = <T>(value: T): Ok<T> => Result.ok(value) as unknown as Ok<T>;

export const Err = <E>(error: E): Err<E> =>
	Result.error(error) as unknown as Err<E>;
