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
> = Readonly<{
        type: Name & string;
} & VariantPayload<Factories[Name]>>;

export type MatchHandlers<Factories extends VariantFactories, Result> = {
        [Name in keyof Factories]: (variant: EnumVariant<Factories, Name>) => Result;
};

export type EnumValue<Factories extends VariantFactories> = {
        match<Result>(handlers: MatchHandlers<Factories, Result>): Result;
} & {
        [Key in keyof Factories]: EnumVariant<Factories, Key>;
}[keyof Factories];

export type EnumType<Factories extends VariantFactories> = {
        new (type: keyof Factories & string, payload: Record<string, unknown>): EnumValue<Factories>;
        readonly prototype: EnumValue<Factories>;
        readonly variants: readonly (keyof Factories & string)[];
} & {
        [Key in keyof Factories]: (
                ...args: Parameters<Factories[Key]>
        ) => EnumVariant<Factories, Key>;
};

function isRecordLike(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
}

export function createEnum<const Factories extends VariantFactories>(
        definitions: Factories,
): EnumType<Factories> {
        class EnumValue {
                public readonly type: keyof Factories & string;

                public constructor(type: keyof Factories & string, payload: Record<string, unknown>) {
                        this.type = type;

                        Object.defineProperty(this, "type", {
                                value: type,
                                enumerable: true,
                                writable: false,
                                configurable: false,
                        });

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
                        const handler = handlers[this.type];

                        if (typeof handler !== "function") {
                                throw new TypeError(
                                        `Match handlers must include a function for variant "${this.type}".`,
                                );
                        }

                        return handler(this as EnumVariant<Factories, typeof this.type>);
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

        return EnumValue as unknown as EnumType<Factories>;
}
