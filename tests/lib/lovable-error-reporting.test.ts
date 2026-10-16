import { afterEach, describe, expect, it, vi } from "vitest";
import { reportLovableError } from "@/lib/lovable-error-reporting";

afterEach(() => {
  delete window.__lovableEvents;
  delete window.__lovableReportRuntimeError;
  vi.unstubAllGlobals();
});

function setup() {
  const captureException = vi.fn();
  const report = vi.fn();
  window.__lovableEvents = { captureException };
  window.__lovableReportRuntimeError = report;
  return { captureException, report };
}

describe("reportLovableError", () => {
  it("does nothing and does not throw when no hooks exist", () => {
    expect(() => reportLovableError(new Error("x"))).not.toThrow();
  });

  it("does not throw when __lovableEvents lacks captureException", () => {
    window.__lovableEvents = {};
    const report = vi.fn();
    window.__lovableReportRuntimeError = report;
    expect(() => reportLovableError(new Error("x"))).not.toThrow();
    expect(report).toHaveBeenCalled();
  });

  it("calls captureException with the error, route and extra context", () => {
    const { captureException } = setup();
    const err = new Error("boom");
    reportLovableError(err, { boundary: "b" });
    expect(captureException).toHaveBeenCalledWith(
      err,
      { source: "react_error_boundary", route: window.location.pathname, boundary: "b" },
      { mechanism: "react_error_boundary", handled: false, severity: "error" },
    );
  });

  it("forwards an Error's message and stack to the runtime hook", () => {
    const { report } = setup();
    const err = new Error("boom");
    reportLovableError(err);
    expect(report).toHaveBeenCalledWith({
      message: "boom",
      stack: err.stack,
      filename: window.location.pathname,
    });
  });

  it("omits stack for non-Errors", () => {
    const { report } = setup();
    reportLovableError("text");
    expect(report).toHaveBeenCalledWith({ message: "text", filename: window.location.pathname });
  });

  it("describes a Response with a URL", () => {
    const { report } = setup();
    const res = new Response(null, { status: 404 });
    Object.defineProperty(res, "url", { value: "https://x.test/a" });
    reportLovableError(res);
    expect(report.mock.calls[0]![0].message).toBe("Response 404 at https://x.test/a");
  });

  it("describes a Response without a URL", () => {
    const { report } = setup();
    reportLovableError(new Response(null, { status: 500 }));
    expect(report.mock.calls[0]![0].message).toBe("Response 500");
  });

  it("uses the message of a plain object", () => {
    const { report } = setup();
    reportLovableError({ message: "db failed", code: "42" });
    expect(report.mock.calls[0]![0].message).toBe("db failed");
  });

  it("JSON-serializes an object with an empty message", () => {
    const { report } = setup();
    reportLovableError({ message: "", code: 1 });
    expect(report.mock.calls[0]![0].message).toBe('{"message":"","code":1}');
  });

  it("truncates serialized objects to 2000 characters", () => {
    const { report } = setup();
    reportLovableError({ big: "y".repeat(3000) });
    expect(report.mock.calls[0]![0].message).toHaveLength(2000);
  });

  it("handles null and undefined", () => {
    const { report } = setup();
    reportLovableError(null);
    reportLovableError(undefined);
    expect(report.mock.calls[0]![0].message).toBe("null");
    expect(report.mock.calls[1]![0].message).toBe("undefined");
  });

  it("falls back to String() for circular objects", () => {
    const { report } = setup();
    const circ: Record<string, unknown> = {};
    circ["self"] = circ;
    reportLovableError(circ);
    expect(report.mock.calls[0]![0].message).toBe("[object Object]");
  });

  it("does nothing on the server where window is undefined", () => {
    const { captureException, report } = setup();
    try {
      vi.stubGlobal("window", undefined);
      expect(() => reportLovableError(new Error("srv"))).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(captureException).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });
});
