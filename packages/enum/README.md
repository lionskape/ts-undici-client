# `@ts-undici-client/enum`

Пакет предоставляет простое средство для объявления перечислений в стиле Rust.

## Использование

```ts
import { createEnum } from "@ts-undici-client/enum";

const Option = createEnum({
        Some: (value: number) => ({ value }),
        None: () => undefined,
});

const value = Option.Some(10);

// Экземпляры перечисления не раскрывают тип варианта, поэтому
// ветвление выполняется через match.

// Полный набор вариантов выводится напрямую из переданного объекта
type OptionVariants = typeof Option.variants; // readonly ["Some", "None"]

// У экземпляра перечисления есть метод match с полной проверкой соответствия вариантов
const asString = value.match({
        Some: ({ value }) => value.toString(),
        None: () => "empty",
});
```
