import { describe, expect, it, vi } from "vitest";
import { runAfterResponse, withExecutionContext } from "@/lib/after-response.server";

describe("runAfterResponse", () => {
  it("hands the work to the Worker's waitUntil without waiting for it", async () => {
    const waitUntil = vi.fn();
    let finish: () => void = () => {};
    const work = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const returned = withExecutionContext({ waitUntil }, () => {
      runAfterResponse(work);
      return "responded";
    });
    expect(returned).toBe("responded");
    expect(waitUntil).toHaveBeenCalledTimes(1);
    const kept = waitUntil.mock.calls[0]?.[0] as Promise<unknown>;
    let settled = false;
    void kept.then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    finish();
    await kept;
    expect(settled).toBe(true);
  });

  it("keeps the execution context across awaits within the same request", async () => {
    const waitUntil = vi.fn();
    await withExecutionContext({ waitUntil }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      runAfterResponse(Promise.resolve());
    });
    expect(waitUntil).toHaveBeenCalledTimes(1);
  });

  it("logs failures and never rejects to the caller", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const waitUntil = vi.fn();
    withExecutionContext({ waitUntil }, () => runAfterResponse(Promise.reject(new Error("boom"))));
    await waitUntil.mock.calls[0]?.[0];
    expect(error).toHaveBeenCalledWith("Background work failed", expect.any(Error));
    error.mockRestore();
  });

  it("still runs the work where there is no Worker context", async () => {
    const ran = vi.fn();
    withExecutionContext(undefined, () => runAfterResponse(Promise.resolve().then(ran)));
    runAfterResponse(Promise.resolve().then(ran));
    await new Promise((r) => setTimeout(r, 0));
    expect(ran).toHaveBeenCalledTimes(2);
  });
});
