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
		readonly isOk: (this: Result<T, E>) => this is Ok<T>;
		readonly isError: (this: Result<T, E>) => this is Err<E>;
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

type AnyResultFactories = ResultFactories<unknown, unknown>;
type AnyResultMethods = ResultMethods<unknown, unknown>;

export type Result<T, E> = EnumInstance<
	ResultFactories<T, E>,
	ResultMethods<T, E>
>;
export type Ok<T> = Result<T, never> & OkPayload<T>;
export type Err<E> = Result<never, E> & ErrPayload<E>;

export const Result = createEnum<AnyResultFactories, AnyResultMethods>(
	{
		ok: (value: unknown) => ({ value }),
		error: (error: unknown) => ({ error }),
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
		map<T, E, U>(this: Result<T, E>, mapper: (value: T) => U) {
			return this.match({
				ok: ({ value }: OkPayload<T>) =>
					Result.ok(mapper(value)) as Result<U, E>,
				error: ({ error }: ErrPayload<E>) =>
					Result.error(error) as Result<U, E>,
			});
		},
		mapError<T, E, F>(this: Result<T, E>, mapper: (error: E) => F) {
			return this.match({
				ok: ({ value }: OkPayload<T>) => Result.ok(value) as Result<T, F>,
				error: ({ error }: ErrPayload<E>) =>
					Result.error(mapper(error)) as Result<T, F>,
			});
		},
		swap<T, E>(this: Result<T, E>) {
			return this.match({
				ok: ({ value }: OkPayload<T>) => Result.error(value) as Result<E, T>,
				error: ({ error }: ErrPayload<E>) => Result.ok(error) as Result<E, T>,
			});
		},
	} as unknown as AnyResultMethods,
);

export const Ok = <T>(value: T): Ok<T> => Result.ok(value) as unknown as Ok<T>;

export const Err = <E>(error: E): Err<E> =>
	Result.error(error) as unknown as Err<E>;
