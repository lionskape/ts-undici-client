export type VariantFactoryResult = Record<string, unknown> | void;

export type VariantFactory<Args extends readonly unknown[] = any[]> = (
        ...args: Args
) => VariantFactoryResult;

export type VariantFactories = { [Name in string]: VariantFactory };

export type VariantPayload<Factory> = Factory extends (...args: any[]) => infer Result
        ? Result extends void
                ? {}
                : Result extends Record<string, unknown>
                        ? Result
                        : never
        : never;

export type EnumVariant<
        Factories extends VariantFactories,
        Name extends keyof Factories,
> = Readonly<VariantPayload<Factories[Name]>>;

export type MatchHandlers<Factories extends VariantFactories, Result> = {
        [Name in keyof Factories]: (variant: EnumVariant<Factories, Name>) => Result;
};

export type EnumValue<Factories extends VariantFactories> = {
        match<Result>(handlers: MatchHandlers<Factories, Result>): Result;
} & {
        [Key in keyof Factories]: EnumVariant<Factories, Key>;
}[keyof Factories];

export type EnumMethods<Factories extends VariantFactories> = {
        [Name in string]: (this: EnumValue<Factories>, ...args: unknown[]) => unknown;
};

export type EnumInstance<
        Factories extends VariantFactories,
        Methods extends EnumMethods<Factories> = Record<string, never>,
> = EnumValue<Factories> & {
        [Key in keyof Methods]: Methods[Key] extends (this: any, ...args: infer Args) => infer Result
                ? (this: EnumInstance<Factories, Methods>, ...args: Args) => Result
                : never;
};

export type EnumType<Factories extends VariantFactories> = {
        new (type: keyof Factories & string, payload: Record<string, unknown>): EnumValue<Factories>;
        readonly prototype: EnumValue<Factories>;
        readonly variants: readonly (keyof Factories & string)[];
} & {
        [Key in keyof Factories]: (
                ...args: Parameters<Factories[Key]>
        ) => EnumVariant<Factories, Key>;
};

export type EnumTypeWithMethods<
        Factories extends VariantFactories,
        Methods extends EnumMethods<Factories>,
> = {
        new (type: keyof Factories & string, payload: Record<string, unknown>): EnumInstance<Factories, Methods>;
        readonly prototype: EnumInstance<Factories, Methods>;
        readonly variants: readonly (keyof Factories & string)[];
} & {
        [Key in keyof Factories]: (
                ...args: Parameters<Factories[Key]>
        ) => EnumInstance<Factories, Methods> & EnumVariant<Factories, Key>;
};

function isRecordLike(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
}

export function createEnum<
        const Factories extends VariantFactories,
        const Methods extends EnumMethods<Factories> = Record<string, never>,
>(definitions: Factories, methods?: Methods): EnumTypeWithMethods<Factories, Methods> {
        class EnumValue {
                readonly #type: keyof Factories & string;

                public constructor(type: keyof Factories & string, payload: Record<string, unknown>) {
                        this.#type = type;

                        for (const key in payload) {
                                if (Object.prototype.hasOwnProperty.call(payload, key)) {
                                        Object.defineProperty(this, key, {
                                                value: payload[key],
                                                enumerable: true,
                                                writable: false,
                                                configurable: false,
                                        });
                                }
                        }

                        Object.freeze(this);
                }

                public match<Result>(handlers: MatchHandlers<Factories, Result>): Result {
                        const type = this.#type;
                        const handler = handlers[type];

                        if (typeof handler !== "function") {
                                throw new TypeError(
                                        `Match handler for variant "${type}" must be a function, got ${typeof handler}.`,
                                );
                        }

                        return handler(this as EnumVariant<Factories, typeof type>);
                }
        }

        if (methods) {
                for (const name of Object.keys(methods)) {
                        const method = methods[name as keyof Methods];

                        if (typeof method !== "function") {
                                throw new TypeError(`Method "${name}" must be a function.`);
                        }

                        Object.defineProperty(EnumValue.prototype, name, {
                                value: function methodWrapper(this: unknown, ...args: unknown[]) {
                                        return (method as (...args: unknown[]) => unknown).apply(this, args);
                                },
                                enumerable: true,
                                writable: false,
                                configurable: false,
                        });
                }
        }

        const variantNames = Object.keys(definitions) as (keyof Factories & string)[];

        for (const name of variantNames) {
                const factory = definitions[name];
                if (typeof factory !== "function") {
                        throw new TypeError(`Factory for variant "${name}" must be a function.`);
                }

                Object.defineProperty(EnumValue, name, {
                        value: (...args: unknown[]) => {
                                const payload = factory(...(args as Parameters<typeof factory>));

                                if (payload !== undefined && !isRecordLike(payload)) {
                                        throw new TypeError(
                                                `Variant factory for "${name}" must return an object or undefined.`,
                                        );
                                }

                                return new EnumValue(
                                        name,
                                        (payload ?? {}) as Record<string, unknown>,
                                ) as unknown as EnumVariant<Factories, typeof name>;
                        },
                        enumerable: true,
                        writable: false,
                        configurable: false,
                });
        }

        Object.defineProperty(EnumValue, "variants", {
                value: Object.freeze([...variantNames]) as readonly (keyof Factories & string)[],
                enumerable: true,
                writable: false,
                configurable: false,
        });

        return EnumValue as unknown as EnumTypeWithMethods<Factories, Methods>;
}
