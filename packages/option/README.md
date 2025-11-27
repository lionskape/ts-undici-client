# @ts-undici-client/option

`@ts-undici-client/option` реализует монаду `Option` через базовый пакет `@ts-undici-client/enum`,
предоставляя безопасный способ работы с наличием/отсутствием значения без `null` и `undefined`.

## Основные возможности

- Конструкторы `Some` и `None`, основанные на перечислении из `@ts-undici-client/enum`.
- Типобезопасное ветвление через метод `match`, предоставляемый перечислением.
- Утилиты `map` и `unwrapOr` для трансформации и безопасного извлечения значения.

## Быстрый старт

```ts
import { match, Option, Some, None, unwrapOr } from "@ts-undici-client/option";

const maybePort = (input: string) => {
        const parsed = Number.parseInt(input, 10);

        return Number.isNaN(parsed) ? None() : Some(parsed);
};

const result = match(maybePort("3000"), {
        some: (value) => `Port: ${value}`,
        none: () => "Port is not defined",
});
// result === "Port: 3000"

const port = unwrapOr(maybePort("not-a-number"), 8080);
// port === 8080

// перечисление также предоставляет список вариантов
Option.variants; // readonly ["some", "none"]
```
