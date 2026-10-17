// Never send story text, meanings, "tell us more", report notes, handles, emails,
// subject text, photo data, or AI output. Properties are only planned keys, ids,
// booleans, counts, outcome names, and query-free page paths.

export const EVENTS = {
  $pageview: ["path"],
  signed_up: [],
  signed_in: [],
  signed_out: [],
  handle_changed: [],
  handle_rejected: [],
  subject_searched: ["found", "jurisdiction"],
  subject_spotted: ["outcome"],
  story_started: [],
  story_submitted: ["source", "has_more_text", "outcome"],
  summary_history_opened: ["versions_shown"],
} as const;

type EventRegistry = Readonly<Record<string, readonly string[]>>;
export const SUBJECT_SPOTTED_OUTCOMES = [
  "new",
  "exists",
  "pending",
  "already_spotted",
  "rejected",
  "rate_limited",
  "error",
] as const;
export const STORY_SUBMITTED_OUTCOMES = [
  "published",
  "pending",
  "rejected",
  "rate_limited",
  "error",
] as const;
type EventProperties<R extends EventRegistry> = {
  [E in keyof R]: {
    [P in R[E][number]]: E extends "subject_spotted"
      ? P extends "outcome"
        ? (typeof SUBJECT_SPOTTED_OUTCOMES)[number]
        : string | number | boolean
      : E extends "story_submitted"
        ? P extends "outcome"
          ? (typeof STORY_SUBMITTED_OUTCOMES)[number]
          : P extends "has_more_text"
            ? boolean
            : string
        : P extends "path"
          ? string
          : string | number | boolean;
  };
};
export type AnalyticsEvents = EventProperties<typeof EVENTS>;

const IDENTIFIERS = [
  "token",
  "distinct_id",
  "$device_id",
  "$anon_distinct_id",
  "$session_id",
  "$window_id",
  "$is_identified",
  "$process_person_profile",
  "is_demo",
];

function filterProperties(properties: Record<string, unknown>, allowed: readonly string[]) {
  return Object.fromEntries(
    Object.entries(properties)
      .filter(([name]) => allowed.includes(name))
      .map(([name, value]) => [
        name,
        name === "path" && typeof value === "string" ? value.split(/[?#]/)[0] : value,
      ]),
  );
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_POSTHOG_KEY?: string;
    readonly VITE_POSTHOG_HOST?: string;
  }
}

type Client = typeof import("posthog-js").default;

// A registry-scoped instance lets tests exercise additional events without
// registering test events in the application's production registry.
export function createAnalytics<const R extends EventRegistry>(registry: R) {
  type Events = EventProperties<R>;
  let clientPromise: Promise<Client | undefined> | undefined;

  function getClient(): Promise<Client | undefined> {
    const key = import.meta.env.VITE_POSTHOG_KEY;
    const host = import.meta.env.VITE_POSTHOG_HOST;
    if (typeof window === "undefined" || !key || !host) return Promise.resolve(undefined);
    clientPromise ??= import("posthog-js")
      .then(({ default: client }) => {
        client.init(key, {
          api_host: host,
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
            if (!event) return null;
            const listed = Object.prototype.hasOwnProperty.call(registry, event.event)
              ? registry[event.event]
              : undefined;
            if (!listed && event.event !== "$identify") return null;
            // The SDK adds URLs, referrers and other strings automatically. Retain
            // only analytics identifiers and explicitly planned properties.
            event.properties = filterProperties(event.properties, [
              ...IDENTIFIERS,
              ...(listed ?? []),
            ]);
            return event;
          },
        });
        return client;
      })
      .catch(() => undefined);
    return clientPromise;
  }

  async function track<E extends keyof Events & string, P extends Events[E]>(
    event: E,
    properties: P & Record<Exclude<keyof P, keyof Events[E]>, never>,
  ): Promise<void> {
    const listed = Object.prototype.hasOwnProperty.call(registry, event)
      ? registry[event]
      : undefined;
    if (!listed) return;
    const client = await getClient();
    if (!client) return;
    client.capture(event, filterProperties(properties, listed));
  }

  async function identify(userId: string): Promise<void> {
    const client = await getClient();
    client?.identify(userId);
  }

  async function setDemo(isDemo: boolean): Promise<void> {
    const client = await getClient();
    client?.register({ is_demo: isDemo });
  }

  async function reset(): Promise<void> {
    const client = await getClient();
    client?.reset();
  }
  return { track, identify, setDemo, reset };
}

export const { track, identify, setDemo, reset } = createAnalytics(EVENTS);
