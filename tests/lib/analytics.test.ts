import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  identify: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: sdk }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("VITE_POSTHOG_KEY", "test-public-token");
  vi.stubEnv("VITE_POSTHOG_HOST", "https://us.i.posthog.com");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("analytics", () => {
  it("silently does nothing without a key", async () => {
    vi.stubEnv("VITE_POSTHOG_KEY", "");
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/" });
    await analytics.identify("user-id");
    await analytics.setDemo(true);
    await analytics.reset();
    for (const method of Object.values(sdk)) expect(method).not.toHaveBeenCalled();
  });

  it("does not initialize during server rendering", async () => {
    vi.stubGlobal("window", undefined);
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/" });
    expect(sdk.init).not.toHaveBeenCalled();
  });

  it("passes planned events to PostHog and initializes only once", async () => {
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/explore" });
    await analytics.identify("user-id");
    await analytics.setDemo(true);
    await analytics.reset();
    expect(sdk.init).toHaveBeenCalledTimes(1);
    expect(sdk.init).toHaveBeenCalledWith(
      "test-public-token",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        autocapture: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: false,
      }),
    );
    expect(sdk.capture).toHaveBeenCalledWith("$pageview", { path: "/explore" });
    expect(sdk.identify).toHaveBeenCalledWith("user-id");
    expect(sdk.register).toHaveBeenCalledWith({ is_demo: true });
    expect(sdk.reset).toHaveBeenCalledTimes(1);
  });

  it("removes query strings and fragments from page views", async () => {
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/explore?email=private@example.com#private" });
    expect(sdk.capture).toHaveBeenCalledWith("$pageview", { path: "/explore" });
  });

  it("drops SDK-added content and unplanned events before sending", async () => {
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/" });
    const beforeSend = sdk.init.mock.calls[0]?.[1].before_send;
    expect(
      beforeSend({
        event: "$pageview",
        properties: {
          path: "/",
          distinct_id: "anonymous-id",
          is_demo: false,
          $current_url: "https://example.com/?email=private",
          $referrer: "private",
          meaning: "private",
          handle: "private",
          $set: { email: "private" },
        },
      }),
    ).toEqual({
      event: "$pageview",
      properties: {
        path: "/",
        distinct_id: "anonymous-id",
        is_demo: false,
      },
    });
    expect(beforeSend(null)).toBeNull();
    expect(beforeSend({ event: "$autocapture", properties: {} })).toBeNull();
  });

  it("silently disables analytics if SDK initialization fails", async () => {
    sdk.init.mockImplementationOnce(() => {
      throw new Error("unavailable");
    });
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/" });
    expect(sdk.capture).not.toHaveBeenCalled();
  });
});
