import { describe, expect, it } from "vitest";
import {
  LIVE_PAGES,
  PREVIEWS,
  PREVIEW_GROUPS,
  findPreview,
  previewHead,
} from "@/lib/preview-registry";

describe("preview registry", () => {
  it("gives every screen a unique slug in a listed group", () => {
    const slugs = PREVIEWS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of PREVIEWS) expect(PREVIEW_GROUPS).toContain(p.group);
    for (const g of PREVIEW_GROUPS) expect(PREVIEWS.some((p) => p.group === g)).toBe(true);
  });

  it("finds screens by slug and nothing else", () => {
    expect(findPreview("plate-catching-up")?.label).toBe("Catching up");
    expect(findPreview("not-a-screen")).toBeUndefined();
  });

  it("keeps the live page links on real routes", () => {
    expect(LIVE_PAGES.map((p) => p.to)).toContain("/demo");
  });
});

describe("previewHead", () => {
  const meta = (h: ReturnType<typeof previewHead>) => h.meta as Record<string, string>[];

  it("gives a screen a unique title and tells search engines not to index it", () => {
    const m = meta(previewHead(findPreview("spot-new")));
    const title = m.find((x) => "title" in x)?.["title"];
    expect(title).toBe("New mystery (sample) | What the Plate?");
    expect(m.find((x) => x["name"] === "robots")?.["content"]).toBe("noindex, nofollow");
    expect(m.find((x) => x["property"] === "og:title")?.["content"]).toBe(title);
    expect(m.find((x) => x["name"] === "description")?.["content"]).toContain("Spot a Plate");
  });

  it("still marks an unknown screen as not indexed", () => {
    const m = meta(previewHead(undefined));
    expect(m.find((x) => "title" in x)?.["title"]).toBe("Sample unavailable | What the Plate?");
    expect(m.find((x) => x["name"] === "robots")?.["content"]).toBe("noindex, nofollow");
  });
});
