import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Mod = typeof import("@/lib/error-capture");
type Handler = (event: unknown) => void;

const originalConsoleError = console.error;
const originalAdd = globalThis.addEventListener;
let handlers: Record<string, Handler>;
let sink: ReturnType<typeof vi.fn>;

async function load(): Promise<Mod> {
  return await import("@/lib/error-capture");
}

beforeEach(() => {
  vi.resetModules();
  handlers = {};
  sink = vi.fn();
  console.error = sink as unknown as typeof console.error;
  globalThis.addEventListener = ((type: string, h: Handler) => {
    handlers[type] = h;
  }) as typeof globalThis.addEventListener;
});

afterEach(() => {
  console.error = originalConsoleError;
  globalThis.addEventListener = originalAdd;
  vi.useRealTimers();
});

describe("listener registration", () => {
  it("registers error and unhandledrejection listeners", async () => {
    await load();
    expect(Object.keys(handlers).sort()).toEqual(["error", "unhandledrejection"]);
  });

  it("skips registration when addEventListener is not a function", async () => {
    (globalThis as { addEventListener?: unknown }).addEventListener = undefined;
    const mod = await load();
    expect(handlers).toEqual({});
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });
});

describe("captured events", () => {
  it("records the .error of an error event", async () => {
    const mod = await load();
    const err = new Error("boom");
    handlers["error"]!({ error: err });
    expect(mod.consumeLastCapturedError()).toBe(err);
  });

  it("falls back to the event itself when it has no .error", async () => {
    const mod = await load();
    const event = { message: "no error" };
    handlers["error"]!(event);
    expect(mod.consumeLastCapturedError()).toBe(event);
  });

  it("records an Error rejection reason", async () => {
    const mod = await load();
    const err = new Error("rejected");
    handlers["unhandledrejection"]!({ reason: err });
    expect(mod.consumeLastCapturedError()).toBe(err);
  });

  it("records a string rejection reason", async () => {
    const mod = await load();
    handlers["unhandledrejection"]!({ reason: "plain" });
    expect(mod.consumeLastCapturedError()).toBe("plain");
  });

  it("clears the captured error after reading it", async () => {
    const mod = await load();
    handlers["error"]!({ error: new Error("once") });
    expect(mod.consumeLastCapturedError()).toBeInstanceOf(Error);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("returns undefined when nothing was captured", async () => {
    const mod = await load();
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("keeps the error up to 5 seconds", async () => {
    vi.useFakeTimers();
    const mod = await load();
    const err = new Error("fresh");
    handlers["error"]!({ error: err });
    vi.advanceTimersByTime(5_000);
    expect(mod.consumeLastCapturedError()).toBe(err);
  });

  it("expires the error after 5 seconds and clears it", async () => {
    vi.useFakeTimers();
    const mod = await load();
    handlers["error"]!({ error: new Error("stale") });
    vi.advanceTimersByTime(5_001);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
    handlers["error"]!({ error: new Error("next") });
    expect(mod.consumeLastCapturedError()).toBeInstanceOf(Error);
  });
});

describe("console.error wrapper", () => {
  it("expands and records Error arguments", async () => {
    const mod = await load();
    const err = new Error("logged");
    console.error("prefix", err, 42);
    expect(sink).toHaveBeenCalledTimes(1);
    const args = sink.mock.calls[0]!;
    expect(args[0]).toBe("prefix");
    expect(typeof args[1]).toBe("string");
    expect(args[1]).toContain("Error: logged");
    expect(args[2]).toBe(42);
    expect(mod.consumeLastCapturedError()).toBe(err);
  });

  it("passes non-Error arguments through untouched", async () => {
    const mod = await load();
    const obj = { a: 1 };
    console.error("x", obj);
    expect(sink).toHaveBeenCalledWith("x", obj);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });
});

describe("describeError", () => {
  it("uses the stack when present", async () => {
    const { describeError } = await load();
    const err = new Error("with stack");
    expect(describeError(err)).toBe(err.stack);
  });

  it("falls back to name and message without a stack", async () => {
    const { describeError } = await load();
    const err = new TypeError("no stack");
    delete err.stack;
    expect(describeError(err)).toBe("TypeError: no stack");
  });

  it("appends a numeric status", async () => {
    const { describeError } = await load();
    const err = Object.assign(new Error("s"), { stack: undefined, status: 404 });
    expect(describeError(err)).toBe("Error: s (status 404)");
  });

  it("appends a numeric statusCode", async () => {
    const { describeError } = await load();
    const err = Object.assign(new Error("s"), { stack: undefined, statusCode: 503 });
    expect(describeError(err)).toBe("Error: s (status 503)");
  });

  it("ignores a non-numeric status", async () => {
    const { describeError } = await load();
    const err = Object.assign(new Error("s"), { stack: undefined, status: "500" });
    expect(describeError(err)).toBe("Error: s");
  });

  it("follows the cause chain up to the depth limit of 5", async () => {
    const { describeError } = await load();
    let current: Error | undefined;
    for (let i = 6; i >= 0; i--) {
      const e: Error = new Error(`e${i}`, current ? { cause: current } : undefined);
      delete e.stack;
      current = e;
    }
    expect(describeError(current)).toBe(
      [
        "Error: e0",
        "caused by: Error: e1",
        "caused by: Error: e2",
        "caused by: Error: e3",
        "caused by: Error: e4",
      ].join("\n"),
    );
  });

  it("stringifies a non-Error cause without a label and stops", async () => {
    const { describeError } = await load();
    const err = new Error("top", { cause: { code: "X" } });
    delete err.stack;
    expect(describeError(err)).toBe('Error: top\n{"code":"X"}');
  });

  it("stringifies a non-Error object", async () => {
    const { describeError } = await load();
    expect(describeError({ a: 1 })).toBe('{"a":1}');
  });

  it("returns a plain string as is", async () => {
    const { describeError } = await load();
    expect(describeError("just text")).toBe("just text");
  });

  it("falls back to String() for circular values", async () => {
    const { describeError } = await load();
    const circ: Record<string, unknown> = {};
    circ["self"] = circ;
    expect(describeError(circ)).toBe("[object Object]");
  });

  it("falls back to String() when JSON.stringify returns undefined", async () => {
    const { describeError } = await load();
    const fn = function named() {};
    expect(describeError(fn)).toBe(String(fn));
  });

  it("returns an empty string for null", async () => {
    const { describeError } = await load();
    expect(describeError(null)).toBe("");
  });

  it("truncates output to 8000 characters", async () => {
    const { describeError } = await load();
    expect(describeError("x".repeat(9_000))).toHaveLength(8_000);
  });
});
