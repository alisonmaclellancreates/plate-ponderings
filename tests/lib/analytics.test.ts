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
  it("account events carry no email, handle, password or moderation output", async () => {
    const analytics = await import("@/lib/analytics");
    for (const event of ["signed_up", "signed_in", "signed_out", "handle_changed", "handle_rejected"] as const) {
      await analytics.track(event, { email: "private", handle: "private", password: "private", moderation: "private" });
      expect(sdk.capture).toHaveBeenLastCalledWith(event, {});
      const beforeSend = sdk.init.mock.calls[0]?.[1].before_send;
      expect(beforeSend({ event, properties: { distinct_id: "id", is_demo: false, email: "private", handle: "private", password: "private", moderation: "private" } })).toEqual({ event, properties: { distinct_id: "id", is_demo: false } });
    }
  });
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

  it("silently does nothing without an explicit host, even with a key", async () => {
    vi.stubEnv("VITE_POSTHOG_HOST", "");
    const analytics = await import("@/lib/analytics");
    await analytics.track("$pageview", { path: "/" });
    await analytics.identify("user-id");
    await analytics.setDemo(true);
    await analytics.reset();
    for (const method of Object.values(sdk)) expect(method).not.toHaveBeenCalled();
  });

  it("rejects unregistered and inherited event names before initializing", async () => {
    const analytics = await import("@/lib/analytics");
    // @ts-expect-error Test runtime protection against callers bypassing types.
    await analytics.track("unregistered", {});
    // @ts-expect-error Object prototype properties are not registered events.
    await analytics.track("toString", {});
    for (const method of Object.values(sdk)) expect(method).not.toHaveBeenCalled();
  });

  it("supports empty property lists and handles malformed path values without throwing", async () => {
    const { createAnalytics } = await import("@/lib/analytics");
    const analytics = createAnalytics({ empty_event: [], path_event: ["path"] } as const);
    await analytics.track("empty_event", {});
    expect(sdk.capture).toHaveBeenCalledWith("empty_event", {});
    const beforeSend = sdk.init.mock.calls[0]?.[1].before_send;
    expect(beforeSend({ event: "empty_event", properties: { path: "/private" } })).toEqual({
      event: "empty_event",
      properties: {},
    });
    expect(beforeSend({ event: "path_event", properties: { path: 42 } })).toEqual({
      event: "path_event",
      properties: { path: 42 },
    });
    expect(beforeSend({ event: "toString", properties: {} })).toBeNull();
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

  it("uses a second registry event through capture and before_send without leaking unlisted properties", async () => {
    const { createAnalytics, EVENTS } = await import("@/lib/analytics");
    const analytics = createAnalytics({
      ...EVENTS,
      test_event: ["outcome", "count", "successful", "path"],
    } as const);
    const properties = {
      outcome: "completed",
      count: 2,
      successful: true,
      path: "/test?private=secret#fragment",
      unlisted: "private content",
    };
    let sent: unknown;
    sdk.capture.mockImplementationOnce((event, captured) => {
      const beforeSend = sdk.init.mock.calls[0]?.[1].before_send;
      sent = beforeSend({
        event,
        properties: {
          ...captured,
          distinct_id: "anonymous-id",
          is_demo: true,
          unlisted: "sdk content",
        },
      });
    });
    // Exercise the runtime boundary with input that bypasses the typed API.
    // @ts-expect-error Unlisted properties are also rejected by the derived type.
    await analytics.track("test_event", properties);
    expect(sdk.capture).toHaveBeenCalledWith("test_event", {
      outcome: "completed",
      count: 2,
      successful: true,
      path: "/test",
    });
    expect(sent).toEqual({
      event: "test_event",
      properties: {
        outcome: "completed",
        count: 2,
        successful: true,
        path: "/test",
        distinct_id: "anonymous-id",
        is_demo: true,
      },
    });
    const beforeSend = sdk.init.mock.calls[0]?.[1].before_send;
    expect(
      beforeSend({
        event: "$identify",
        properties: {
          distinct_id: "user-id",
          is_demo: false,
          path: "/private",
          outcome: "private",
        },
      }),
    ).toEqual({
      event: "$identify",
      properties: { distinct_id: "user-id", is_demo: false },
    });
    expect(
      beforeSend({ event: "$pageview", properties: { path: "/?secret=yes", outcome: "private" } }),
    ).toEqual({
      event: "$pageview",
      properties: { path: "/" },
    });
  });
});
