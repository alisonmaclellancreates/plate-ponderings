// Never send story text, meanings, "tell us more", report notes, handles, emails,
// subject text, photo data, or AI output. Properties are only planned keys, ids,
// booleans, counts, outcome names, and query-free page paths.

export type AnalyticsEvents = {
  $pageview: { path: string };
};

type Client = typeof import("posthog-js").default;
let clientPromise: Promise<Client | undefined> | undefined;

function getClient(): Promise<Client | undefined> {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (typeof window === "undefined" || !key) return Promise.resolve(undefined);
  clientPromise ??= import("posthog-js")
    .then(({ default: client }) => {
      client.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST,
        autocapture: false,
        disable_session_recording: true,
        person_profiles: "identified_only",
        capture_pageview: false,
        capture_pageleave: false,
        capture_exceptions: false,
        capture_performance: false,
        disable_surveys: true,
        advanced_disable_flags: true,
        before_send: (event) => {
          if (!event || !["$pageview", "$identify"].includes(event.event)) return null;
          // The SDK adds URLs, referrers and other strings automatically. Retain
          // only analytics identifiers and explicitly planned properties.
          const allowed = new Set([
            "token",
            "distinct_id",
            "$device_id",
            "$anon_distinct_id",
            "$session_id",
            "$window_id",
            "$is_identified",
            "$process_person_profile",
            "is_demo",
            "path",
          ]);
          event.properties = Object.fromEntries(
            Object.entries(event.properties).filter(([name]) => allowed.has(name)),
          );
          return event;
        },
      });
      return client;
    })
    .catch(() => undefined);
  return clientPromise;
}

export async function track<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E],
): Promise<void> {
  const client = await getClient();
  if (!client) return;
  client.capture(event, { path: properties.path.split(/[?#]/)[0] });
}

export async function identify(userId: string): Promise<void> {
  const client = await getClient();
  client?.identify(userId);
}

export async function setDemo(isDemo: boolean): Promise<void> {
  const client = await getClient();
  client?.register({ is_demo: isDemo });
}

export async function reset(): Promise<void> {
  const client = await getClient();
  client?.reset();
}
