import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { brokeredPreviewStorage } from "@/integrations/supabase/previewAuthStorage";

const UUID = "123e4567-e89b-42d3-a456-426614174000";
const EDITOR = "https://lovable.dev";
const KEY = "sb-test-auth-token";

type Msg = { type: string; requestId: string; projectId: string; key: string; value?: string };
type Reply = { origin: string; data: unknown };
type Responder = (msg: Msg, origin: string) => Reply[] | undefined;

type Adapter = {
  getItem: (k: string) => Promise<string | null>;
  setItem: (k: string, v: string) => Promise<void>;
  removeItem: (k: string) => Promise<void>;
};

const parentDescriptor = Object.getOwnPropertyDescriptor(window, "parent");

function setHost(host: string, ancestors?: string[], referrer = "") {
  Object.defineProperty(window.location, "hostname", { configurable: true, get: () => host });
  Object.defineProperty(window.location, "ancestorOrigins", {
    configurable: true,
    get: () => ancestors,
  });
  Object.defineProperty(document, "referrer", { configurable: true, get: () => referrer });
}

function frame(responder?: Responder) {
  const postMessage = vi.fn((msg: Msg, origin: string) => {
    const replies = responder?.(msg, origin);
    if (replies) {
      queueMicrotask(() => {
        for (const r of replies) {
          window.dispatchEvent(new MessageEvent("message", { origin: r.origin, data: r.data }));
        }
      });
    }
  });
  Object.defineProperty(window, "parent", { configurable: true, value: { postMessage } });
  return postMessage;
}

function notFramed() {
  Object.defineProperty(window, "parent", { configurable: true, value: window });
}

const answer =
  (value: unknown, ok = true): Responder =>
  (msg, origin) =>
    origin === EDITOR
      ? [
          {
            origin: EDITOR,
            data: { type: "lovable-preview-auth:result", requestId: msg.requestId, ok, value },
          },
        ]
      : undefined;

function adapter(): Adapter {
  setHost(`id-preview--${UUID}.lovable.app`, [EDITOR]);
  return brokeredPreviewStorage() as unknown as Adapter;
}

beforeEach(() => {
  localStorage.clear();
  notFramed();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (window.location as unknown as Record<string, unknown>)["hostname"];
  delete (window.location as unknown as Record<string, unknown>)["ancestorOrigins"];
  delete (document as unknown as Record<string, unknown>)["referrer"];
  if (parentDescriptor) Object.defineProperty(window, "parent", parentDescriptor);
  else delete (window as unknown as Record<string, unknown>)["parent"];
  localStorage.clear();
});

describe("brokeredPreviewStorage selection", () => {
  it("returns undefined on the server", () => {
    vi.stubGlobal("window", undefined);
    try {
      expect(brokeredPreviewStorage()).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("uses localStorage outside a preview zone", () => {
    setHost("localhost", [EDITOR]);
    frame();
    expect(brokeredPreviewStorage()).toBe(localStorage);
  });

  it("uses localStorage on a preview zone when not framed", () => {
    setHost(`id-preview--${UUID}.lovable.app`, [EDITOR]);
    expect(brokeredPreviewStorage()).toBe(localStorage);
  });

  it.each(["lovable.app", "my-app.lovable.app", `preview--${UUID}.lovable.app`])(
    "uses localStorage when no trusted project id is in %s",
    (host) => {
      setHost(host, [EDITOR]);
      frame();
      expect(brokeredPreviewStorage()).toBe(localStorage);
    },
  );

  it("reads a leading project id host and posts it", async () => {
    setHost(`${UUID}-dev.lovableproject.com`, [EDITOR]);
    const post = frame(answer("v"));
    const s = brokeredPreviewStorage() as unknown as Adapter;
    await s.getItem(KEY);
    expect(post.mock.calls[0]?.[0].projectId).toBe(UUID);
  });
});

describe("editor origin resolution", () => {
  async function originsFor(host: string, ancestors: string[] | undefined, referrer = "") {
    setHost(host, ancestors, referrer);
    vi.useFakeTimers();
    const post = frame();
    const s = brokeredPreviewStorage() as unknown as Adapter;
    void s.removeItem(KEY);
    await vi.advanceTimersByTimeAsync(2000);
    return post.mock.calls.map((c) => c[1]);
  }
  const prod = `id-preview--${UUID}.lovable.app`;
  const dev = `id-preview--${UUID}.lovableproject-dev.com`;

  it("uses a trusted ancestor origin", async () => {
    expect(await originsFor(prod, ["https://app.lovable.dev"])).toEqual([
      "https://app.lovable.dev",
    ]);
  });

  it("falls back to the referrer origin when ancestorOrigins is missing or empty", async () => {
    expect(await originsFor(prod, undefined, "https://x.lovable.dev/p")).toEqual([
      "https://x.lovable.dev",
    ]);
    expect(await originsFor(prod, [], "https://gptengineer.app/p")).toEqual([
      "https://gptengineer.app",
    ]);
  });

  it("uses the default editor for an untrusted or absent ancestor", async () => {
    expect(await originsFor(prod, ["https://evil.example"])).toEqual([EDITOR]);
    expect(await originsFor(prod, undefined, "")).toEqual([EDITOR]);
    expect(await originsFor(prod, ["http://localhost:3000"])).toEqual([EDITOR]);
  });

  it("allows localhost:3000 on dev hosts", async () => {
    expect(await originsFor(dev, undefined)).toEqual([EDITOR, "http://localhost:3000"]);
    expect(await originsFor(`${UUID}.gpt-eng.com`, ["http://localhost:3000"])).toEqual([
      "http://localhost:3000",
    ]);
  });
});

describe("getItem", () => {
  it("posts a get request and seeds an empty local copy with the editor value", async () => {
    const post = frame(answer("editor-session"));
    const s = adapter();
    expect(await s.getItem(KEY)).toBe("editor-session");
    expect(localStorage.getItem(KEY)).toBe("editor-session");
    const msg = post.mock.calls[0]?.[0];
    expect(msg).toMatchObject({ type: "lovable-preview-auth:get", projectId: UUID, key: KEY });
    expect(msg && "value" in msg).toBe(false);
    expect(post.mock.calls[0]?.[1]).toBe(EDITOR);
  });

  it("sends the local value and does not overwrite it", async () => {
    localStorage.setItem(KEY, "local");
    const post = frame(answer("editor"));
    expect(await adapter().getItem(KEY)).toBe("editor");
    expect(post.mock.calls[0]?.[0].value).toBe("local");
    expect(localStorage.getItem(KEY)).toBe("local");
  });

  it("treats an empty reply as a logout tombstone", async () => {
    localStorage.setItem(KEY, "local");
    frame(answer(""));
    expect(await adapter().getItem(KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("keeps a tombstoned local copy that changed meanwhile", async () => {
    localStorage.setItem(KEY, "local");
    frame((msg, origin) => {
      localStorage.setItem(KEY, "newer");
      return answer("")(msg, origin);
    });
    expect(await adapter().getItem(KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBe("newer");
  });

  it("does not seed when local changed meanwhile", async () => {
    frame((msg, origin) => {
      localStorage.setItem(KEY, "raced");
      return answer("editor")(msg, origin);
    });
    expect(await adapter().getItem(KEY)).toBe("editor");
    expect(localStorage.getItem(KEY)).toBe("raced");
  });

  it("ignores wrong origins, wrong ids and malformed replies", async () => {
    frame((msg) => [
      {
        origin: "https://evil.example",
        data: {
          type: "lovable-preview-auth:result",
          requestId: msg.requestId,
          ok: true,
          value: "evil",
        },
      },
      {
        origin: EDITOR,
        data: {
          type: "lovable-preview-auth:result",
          requestId: "other",
          ok: true,
          value: "wrong-id",
        },
      },
      { origin: EDITOR, data: null },
      { origin: EDITOR, data: { type: "something-else", requestId: msg.requestId } },
      {
        origin: EDITOR,
        data: {
          type: "lovable-preview-auth:result",
          requestId: msg.requestId,
          ok: true,
          value: "right",
        },
      },
    ]);
    expect(await adapter().getItem(KEY)).toBe("right");
  });

  it("falls back to local when the reply is not ok or has no string value", async () => {
    localStorage.setItem(KEY, "local");
    frame(answer("x", false));
    expect(await adapter().getItem(KEY)).toBe("local");
    frame(answer(null));
    expect(await adapter().getItem(KEY)).toBe("local");
  });

  it("retries once after the first timeout and uses the retry answer", async () => {
    vi.useFakeTimers();
    let calls = 0;
    const post = frame((msg, origin) => (++calls === 2 ? answer("late")(msg, origin) : undefined));
    const p = adapter().getItem(KEY);
    await vi.advanceTimersByTimeAsync(2250);
    expect(await p).toBe("late");
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("falls back to local after both attempts time out, and retries only on the first get", async () => {
    vi.useFakeTimers();
    localStorage.setItem(KEY, "local");
    const post = frame();
    const s = adapter();
    const p1 = s.getItem(KEY);
    await vi.advanceTimersByTimeAsync(4250);
    expect(await p1).toBe("local");
    expect(post).toHaveBeenCalledTimes(2);
    const p2 = s.getItem(KEY);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await p2).toBe("local");
    expect(post).toHaveBeenCalledTimes(3);
  });

  it("still returns the editor value when local storage is blocked", async () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    vi.spyOn(proto, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const setSpy = vi.spyOn(proto, "setItem");
    const post = frame(answer("editor"));
    expect(await adapter().getItem(KEY)).toBe("editor");
    expect(post.mock.calls[0]?.[0] && "value" in post.mock.calls[0][0]).toBe(false);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("returns null on a tombstone without touching blocked storage", async () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    vi.spyOn(proto, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const removeSpy = vi.spyOn(proto, "removeItem");
    frame(answer(""));
    expect(await adapter().getItem(KEY)).toBeNull();
    expect(removeSpy).not.toHaveBeenCalled();
  });

  it("still returns the editor value when seeding fails", async () => {
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    vi.spyOn(proto, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    frame(answer("editor"));
    expect(await adapter().getItem(KEY)).toBe("editor");
  });
});

describe("setItem", () => {
  it("writes locally, posts the value, and adopts the editor's canonical value", async () => {
    const post = frame(answer("canonical"));
    const s = adapter();
    const p = s.setItem(KEY, "mine");
    expect(localStorage.getItem(KEY)).toBe("mine");
    await p;
    expect(post.mock.calls[0]?.[0]).toMatchObject({
      type: "lovable-preview-auth:set",
      value: "mine",
    });
    expect(localStorage.getItem(KEY)).toBe("canonical");
  });

  it("removes the local copy when the editor replies with a tombstone", async () => {
    frame(answer(""));
    await adapter().setItem(KEY, "mine");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("leaves a value that changed meanwhile", async () => {
    frame((msg, origin) => {
      localStorage.setItem(KEY, "raced");
      return answer("canonical")(msg, origin);
    });
    await adapter().setItem(KEY, "mine");
    expect(localStorage.getItem(KEY)).toBe("raced");
  });

  it("keeps the local value when the editor does not answer", async () => {
    vi.useFakeTimers();
    frame();
    const p = adapter().setItem(KEY, "mine");
    await vi.advanceTimersByTimeAsync(2000);
    await p;
    expect(localStorage.getItem(KEY)).toBe("mine");
  });

  it("ignores a non-ok reply", async () => {
    frame(answer("canonical", false));
    await adapter().setItem(KEY, "mine");
    expect(localStorage.getItem(KEY)).toBe("mine");
  });
});

describe("removeItem", () => {
  it("removes locally and posts the previous value", async () => {
    localStorage.setItem(KEY, "old");
    const post = frame(answer(null));
    await expect(adapter().removeItem(KEY)).resolves.toBeUndefined();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(post.mock.calls[0]?.[0]).toMatchObject({
      type: "lovable-preview-auth:remove",
      value: "old",
    });
  });

  it("resolves after a timeout and omits the value when storage is blocked", async () => {
    vi.useFakeTimers();
    const proto = Object.getPrototypeOf(localStorage) as Storage;
    vi.spyOn(proto, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const post = frame();
    const p = adapter().removeItem(KEY);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBeUndefined();
    expect(post.mock.calls[0]?.[0] && "value" in post.mock.calls[0][0]).toBe(false);
  });
});
