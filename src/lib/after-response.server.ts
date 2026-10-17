import { AsyncLocalStorage } from "node:async_hooks";

type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

const storage = new AsyncLocalStorage<ExecutionContext | undefined>();

function asExecutionContext(ctx: unknown): ExecutionContext | undefined {
  if (ctx && typeof (ctx as ExecutionContext).waitUntil === "function") {
    return ctx as ExecutionContext;
  }
  return undefined;
}

/** Runs one request with the Worker's execution context available to runAfterResponse. */
export function withExecutionContext<T>(ctx: unknown, fn: () => T): T {
  return storage.run(asExecutionContext(ctx), fn);
}

/**
 * Starts work without making the caller wait. On the Worker, waitUntil keeps
 * the request alive until the work settles, even after the response is sent.
 * Elsewhere (dev server, tests) the work simply runs. Failures are logged and
 * never reach the caller.
 */
export function runAfterResponse(work: Promise<unknown>): void {
  const guarded = work.catch((error: unknown) => {
    console.error("Background work failed", error);
  });
  storage.getStore()?.waitUntil(guarded);
}
