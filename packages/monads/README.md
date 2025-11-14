# @ts-undici-client/monads

`@ts-undici-client/monads` предоставляет минималистичную rust-стиле монаду `Result` для работы с функциями, которые могут завершиться успешно или с ошибкой.

## Основные возможности

- Конструкторы `Ok` и `Error` для явного создания успешных и ошибочных результатов.
- Функции `map` и `mapError` для трансформации значения успеха или ошибки без изменения типа `Result`.
- Функция `swap`, позволяющая превратить `Ok` в `Error` и наоборот.
- Функция `match` для удобного pattern matching, аналогичного конструкции `match` в Rust.

## Быстрый старт

```ts
import { Error, Ok, match, Result } from "@ts-undici-client/monads";

const division = (numerator: number, denominator: number): Result<number, string> => {
        if (denominator === 0) {
                return Error("Division by zero");
        }

        return Ok(numerator / denominator);
};

const value = match(division(8, 2), {
        ok: (result) => `Result: ${result}`,
        error: (message) => `Error: ${message}`,
});
// value === "Result: 4"
```
