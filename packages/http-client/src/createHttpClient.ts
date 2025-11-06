import { assign, createMachine, fromPromise } from "xstate";
import type { AnyEventObject } from "xstate";

import { HttpClientError } from "./errors.js";
import type {
        CreateHttpClientMachineOptions,
        HttpClientMachineContext,
        HttpClientMachineEvent,
        HttpClientMachineServices,
        HttpClientResponseSnapshot,
        HttpResultWithSchemas,
        PreparedRequest,
} from "./types.js";

const noop = () => undefined;

const createNotImplementedService = (step: keyof HttpClientMachineServices<any, any>) => async () => {
        throw new HttpClientError(`Http client ${step} handler is not implemented`, {
                code: "not_implemented",
        });
};

function isObjectLike(value: unknown): value is Record<string, unknown> {
        return typeof value === "object" && value !== null;
}

function isPreparedRequestEvent<
        TResponseSchemas extends Record<number, unknown>,
        TOpaqueExtra extends Record<string, unknown>
>(event: AnyEventObject): event is AnyEventObject & { data: PreparedRequest<TResponseSchemas, TOpaqueExtra> } {
        return isObjectLike((event as { data?: unknown }).data) && "options" in ((event as { data?: Record<string, unknown> }).data ?? {});
}

function isResponseEvent(event: AnyEventObject): event is AnyEventObject & { data: HttpClientResponseSnapshot } {
        const data = (event as { data?: unknown }).data;
        return isObjectLike(data) && typeof (data as { status?: unknown }).status === "number" && "headers" in (data as Record<string, unknown>);
}

function isResultEvent<
        TResponseSchemas extends Record<number, unknown>,
        TOpaqueExtra extends Record<string, unknown>
>(event: AnyEventObject): event is AnyEventObject & { data: HttpResultWithSchemas<TResponseSchemas, TOpaqueExtra> } {
        const data = (event as { data?: unknown }).data;
        return isObjectLike(data) && "opaque" in (data as Record<string, unknown>);
}

export function createHttpClientMachine<
        TResponseSchemas extends Record<number, unknown> = Record<number, unknown>,
        TOpaqueExtra extends Record<string, unknown> = {}
>(
        options: CreateHttpClientMachineOptions<TResponseSchemas, TOpaqueExtra> = {}
) {
        const {
                id = "httpClient",
                maxAttempts = 1,
                services: providedServices = {},
                actions: providedActions = {},
                initialContext,
        } = options;

        const services: Required<HttpClientMachineServices<TResponseSchemas, TOpaqueExtra>> = {
                prepareRequest:
                        providedServices.prepareRequest ??
                        (createNotImplementedService("prepareRequest") as Required<HttpClientMachineServices<TResponseSchemas, TOpaqueExtra>>["prepareRequest"]),
                dispatchRequest:
                        providedServices.dispatchRequest ??
                        (createNotImplementedService("dispatchRequest") as Required<HttpClientMachineServices<TResponseSchemas, TOpaqueExtra>>["dispatchRequest"]),
                validateResponse:
                        providedServices.validateResponse ??
                        (createNotImplementedService("validateResponse") as Required<HttpClientMachineServices<TResponseSchemas, TOpaqueExtra>>["validateResponse"]),
                cancelRequest: providedServices.cancelRequest ?? (async () => {}),
        };

        const resolvedActions = {
                onRequestQueued: providedActions.onRequestQueued ?? noop,
                onSuccess: providedActions.onSuccess ?? noop,
                onFailure: providedActions.onFailure ?? noop,
                onCancelled: providedActions.onCancelled ?? noop,
        };

        const baseContext: HttpClientMachineContext<TResponseSchemas, TOpaqueExtra> = {
                attempt: initialContext?.attempt ?? 0,
                ...initialContext,
        };

        return createMachine(
                {
                        id,
                        initial: "idle",
                        context: baseContext,
                        states: {
                                idle: {
                                        on: {
                                                REQUEST: {
                                                        target: "preparing",
                                                        actions: ["queueRequest", "notifyQueued"],
                                                },
                                        },
                                },
                                preparing: {
                                        entry: "incrementAttempt",
                                        invoke: {
                                                id: "prepareRequest",
                                                src: "prepareRequest",
                                                input: ({ context }) => context,
                                                onDone: {
                                                        target: "dispatching",
                                                        actions: "storePreparedRequest",
                                                },
                                                onError: {
                                                        target: "failed",
                                                        actions: ["storeFailure"],
                                                },
                                        },
                                        on: {
                                                CANCEL: {
                                                        target: "cancelled",
                                                        actions: ["markCancelled", "executeCancel"],
                                                },
                                        },
                                },
                                dispatching: {
                                        invoke: {
                                                id: "dispatchRequest",
                                                src: "dispatchRequest",
                                                input: ({ context }) => context,
                                                onDone: {
                                                        target: "validating",
                                                        actions: "storeResponse",
                                                },
                                                onError: {
                                                        target: "failed",
                                                        actions: ["storeFailure"],
                                                },
                                        },
                                        on: {
                                                CANCEL: {
                                                        target: "cancelled",
                                                        actions: ["markCancelled", "executeCancel"],
                                                },
                                        },
                                },
                                validating: {
                                        invoke: {
                                                id: "validateResponse",
                                                src: "validateResponse",
                                                input: ({ context }) => context,
                                                onDone: {
                                                        target: "succeeded",
                                                        actions: "storeResult",
                                                },
                                                onError: {
                                                        target: "failed",
                                                        actions: ["storeFailure"],
                                                },
                                        },
                                        on: {
                                                CANCEL: {
                                                        target: "cancelled",
                                                        actions: ["markCancelled", "executeCancel"],
                                                },
                                        },
                                },
                                succeeded: {
                                        entry: "notifySuccess",
                                        on: {
                                                REQUEST: {
                                                        target: "preparing",
                                                        actions: ["queueRequest", "notifyQueued"],
                                                },
                                                RESET: {
                                                        target: "idle",
                                                        actions: "resetContext",
                                                },
                                        },
                                },
                                failed: {
                                        entry: "notifyFailure",
                                        on: {
                                                RETRY: {
                                                        target: "preparing",
                                                        guard: "canRetry",
                                                },
                                                REQUEST: {
                                                        target: "preparing",
                                                        actions: ["queueRequest", "notifyQueued"],
                                                },
                                                RESET: {
                                                        target: "idle",
                                                        actions: "resetContext",
                                                },
                                        },
                                },
                                cancelled: {
                                        entry: "notifyCancelled",
                                        on: {
                                                REQUEST: {
                                                        target: "preparing",
                                                        actions: ["queueRequest", "notifyQueued"],
                                                },
                                                RESET: {
                                                        target: "idle",
                                                        actions: "resetContext",
                                                },
                                        },
                                },
                        },
                },
                {
                        actors: {
                                prepareRequest: fromPromise(({ input }) =>
                                        services.prepareRequest(input as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>)
                                ),
                                dispatchRequest: fromPromise(({ input }) =>
                                        services.dispatchRequest(input as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>)
                                ),
                                validateResponse: fromPromise(({ input }) =>
                                        services.validateResponse(input as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>)
                                ),
                        },
                        guards: {
                                canRetry: ({ context }) =>
                                        (context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>).attempt < maxAttempts,
                        },
                        actions: {
                                queueRequest: assign(({ event }) => {
                                        if ((event as HttpClientMachineEvent<TResponseSchemas, TOpaqueExtra>).type !== "REQUEST") {
                                                return {};
                                        }

                                        const requestEvent = event as HttpClientMachineEvent<TResponseSchemas, TOpaqueExtra> & {
                                                type: "REQUEST";
                                        };

                                        return {
                                                request: requestEvent.input,
                                                prepared: undefined,
                                                response: undefined,
                                                result: undefined,
                                                error: undefined,
                                                cancelled: false,
                                                attempt: 0,
                                        } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>;
                                }),
                                notifyQueued: ({ context, event }) => {
                                        if ((event as HttpClientMachineEvent<TResponseSchemas, TOpaqueExtra>).type === "REQUEST") {
                                                resolvedActions.onRequestQueued(
                                                        context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>,
                                                        event as HttpClientMachineEvent<TResponseSchemas, TOpaqueExtra>
                                                );
                                        }
                                },
                                incrementAttempt: assign(({ context }) => {
                                        const current = context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>;
                                        return { attempt: current.attempt + 1 };
                                }),
                                storePreparedRequest: assign(({ event }) => {
                                        if (isPreparedRequestEvent<TResponseSchemas, TOpaqueExtra>(event)) {
                                                return {
                                                        prepared: event.data,
                                                        error: undefined,
                                                } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>;
                                        }

                                        return {};
                                }),
                                storeResponse: assign(({ event }) => {
                                        if (isResponseEvent(event)) {
                                                return {
                                                        response: event.data,
                                                        error: undefined,
                                                } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>;
                                        }

                                        return {};
                                }),
                                storeResult: assign(({ event }) => {
                                        if (isResultEvent<TResponseSchemas, TOpaqueExtra>(event)) {
                                                return {
                                                        result: event.data,
                                                        error: undefined,
                                                } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>;
                                        }

                                        return {};
                                }),
                                storeFailure: assign(({ event }) => ({
                                        error: (event as { data?: unknown }).data ?? event,
                                } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>)),
                                markCancelled: assign(() => ({
                                        cancelled: true,
                                } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>)),
                                executeCancel: ({ context }) => {
                                        void services.cancelRequest(context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>);
                                },
                                resetContext: assign(() => ({
                                        request: undefined,
                                        prepared: undefined,
                                        response: undefined,
                                        result: undefined,
                                        error: undefined,
                                        cancelled: false,
                                        attempt: 0,
                                } satisfies Partial<HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>>)),
                                notifySuccess: ({ context }) => {
                                        resolvedActions.onSuccess(context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>);
                                },
                                notifyFailure: ({ context }) => {
                                        resolvedActions.onFailure(context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>);
                                },
                                notifyCancelled: ({ context }) => {
                                        resolvedActions.onCancelled(context as HttpClientMachineContext<TResponseSchemas, TOpaqueExtra>);
                                },
                        },
                }
        );
}
