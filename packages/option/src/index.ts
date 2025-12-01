import {
	createEnum,
	type EnumInstance,
	type EnumMethods,
	type EnumVariant,
} from "@ts-undici-client/enum";

type OptionFactories<T> = {
	readonly some: (value: T) => { readonly value: T };
	readonly none: () => undefined;
};

type SomePayload<T> = EnumVariant<OptionFactories<T>, "some">;
type NonePayload = EnumVariant<OptionFactories<unknown>, "none">;

type OptionMethods<T> = EnumMethods<
	OptionFactories<T>,
	{
		readonly isSome: (this: Option<T>) => boolean;
		readonly isNone: (this: Option<T>) => boolean;
		readonly map: <U>(this: Option<T>, mapper: (value: T) => U) => Option<U>;
		readonly matchValue: <R>(
			this: Option<T>,
			patterns: { readonly some: (value: T) => R; readonly none: () => R },
		) => R;
		readonly unwrapOr: (this: Option<T>, defaultValue: T) => T;
	}
>;

export type Option<T> = EnumInstance<OptionFactories<T>, OptionMethods<T>>;
export type Some<T> = Option<T> & SomePayload<T>;
export type None = Option<never> & NonePayload;

export const OptionEnum = createEnum<
	OptionFactories<unknown>,
	OptionMethods<unknown>
>(
	{
		some: (value) => ({ value }),
		none: () => undefined,
	},
	{
		isSome<T>(this: Option<T>) {
			return this.match({
				some: () => true,
				none: () => false,
			});
		},
		isNone<T>(this: Option<T>) {
			return this.match({
				some: () => false,
				none: () => true,
			});
		},
		map<T, U>(this: Option<T>, mapper: (value: T) => U): Option<U> {
			return this.match({
				some: ({ value }: SomePayload<T>) =>
					OptionEnum.some(mapper(value)) as unknown as Option<U>,
				none: (): Option<U> => OptionEnum.none() as unknown as Option<U>,
			});
		},
		matchValue<T, R>(
			this: Option<T>,
			patterns: { readonly some: (value: T) => R; readonly none: () => R },
		) {
			return this.match({
				some: ({ value }: SomePayload<T>) => patterns.some(value),
				none: patterns.none,
			});
		},
		unwrapOr<T>(this: Option<T>, defaultValue: T) {
			return this.match({
				some: ({ value }: SomePayload<T>) => value,
				none: () => defaultValue,
			});
		},
	},
);

export const Some = <T>(value: T): Some<T> =>
	OptionEnum.some(value) as unknown as Some<T>;

export const None = (): None => OptionEnum.none() as unknown as None;

export const Option = Object.freeze({
	Some,
	None,
	variants: OptionEnum.variants,
});
