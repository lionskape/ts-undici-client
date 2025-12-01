# @ts-undici-client/result

`@ts-undici-client/result` — минималистичная монада `Result` в стиле Rust, созданная с помощью `createEnum`.
Она предоставляет функции для безопасной работы со значениями, которые могут быть успешными (`Ok`) или ошибочными (`Err`).

## Основные возможности

- Конструкторы `Ok` и `Err` для явного создания результата.
- Методы экземпляров `isOk` и `isError` для проверки варианта.
- Методы `map`, `mapError` и `swap` для трансформации значения успеха или ошибки.
- Метод `match` для pattern matching без обращения к полям полезной нагрузки.

## Быстрый старт

```ts
import { Err, Ok } from "@ts-undici-client/result";

const parseNumber = (value: string) => {
        const parsed = Number(value);

        return Number.isNaN(parsed) ? Err("Not a number") : Ok(parsed);
};

const message = parseNumber("8").match({
        ok: (num) => `Parsed: ${num}`,
        error: (err) => `Error: ${err}`,
});
// message === "Parsed: 8"
```
