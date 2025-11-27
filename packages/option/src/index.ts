import { createEnum, type EnumValue, type EnumVariant } from "@ts-undici-client/enum";

type OptionFactories<T> = {
        readonly some: (value: T) => { readonly value: T };
        readonly none: () => undefined;
};

type AnyOptionFactories = OptionFactories<unknown>;

type SomePayload<T> = EnumVariant<OptionFactories<T>, "some">;
type NonePayload = EnumVariant<OptionFactories<unknown>, "none">;

const OptionEnum = createEnum<AnyOptionFactories>({
        some: (value: unknown) => ({ value }),
        none: () => undefined,
});

export type Option<T> = EnumValue<OptionFactories<T>>;
export type Some<T> = Option<T> & SomePayload<T>;
export type None = Option<never> & NonePayload;

export const Some = <T>(value: T): Some<T> =>
        OptionEnum.some(value) as unknown as Some<T>;

export const None = (): None => OptionEnum.none() as None;

export const Option = Object.freeze({
        Some,
        None,
        isSome,
        isNone,
        map,
        match,
        unwrapOr,
        variants: OptionEnum.variants,
});

export function isSome<T>(option: Option<T>): option is Some<T> {
        return option.match({
                some: () => true,
                none: () => false,
        });
}

export function isNone<T>(option: Option<T>): option is None {
        return option.match({
                some: () => false,
                none: () => true,
        });
}

export function map<T, U>(option: Option<T>, mapper: (value: T) => U): Option<U> {
        return option.match({
                some: ({ value }: SomePayload<T>) => Some(mapper(value)),
                none: () => None(),
        });
}

export function match<T, R>(
        option: Option<T>,
        patterns: {
                readonly some: (value: T) => R;
                readonly none: () => R;
        },
): R {
        return option.match({
                some: ({ value }: SomePayload<T>) => patterns.some(value),
                none: patterns.none,
        });
}

export function unwrapOr<T>(option: Option<T>, defaultValue: T): T {
        return option.match({
                some: ({ value }: SomePayload<T>) => value,
                none: () => defaultValue,
        });
}
