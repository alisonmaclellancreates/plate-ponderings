import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => {
    let href = to;
    for (const [k, v] of Object.entries(params ?? {})) href = href.replace(`$${k}`, v);
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
  useRouterState: () => ({}),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(async () => {}) }));
const decodePhoto = vi.fn();
vi.mock("@/lib/photo-canvas", () => ({ decodePhoto: (b: Blob) => decodePhoto(b) }));
vi.mock("@/components/site/PhotoEditor", () => ({
  PhotoEditor: ({ initialBox }: { initialBox: unknown }) => (
    <p>editor {initialBox ? "with box" : "no box"}</p>
  ),
}));

import {
  PREVIEW_SCREENS,
  PreviewScreen,
  SamplePhotoEditor,
  SamplePlateLink,
} from "@/components/previews/PreviewScreens";
import { PreviewIndex } from "@/components/previews/PreviewIndex";
import { LIVE_PAGES, PREVIEWS } from "@/lib/preview-registry";
import { STORY_PHOTO_PLACEHOLDER } from "@/lib/mock-data";

const fetchSpy = vi.fn();
beforeEach(() => {
  fetchSpy.mockReset();
  fetchSpy.mockImplementation(async () => new Response(new Blob(["x"])));
  vi.stubGlobal("fetch", fetchSpy);
  decodePhoto.mockReset();
  decodePhoto.mockRejectedValue(new Error("no decoder"));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Every request the gallery makes; only the bundled sample photo is allowed. */
const requests = () => fetchSpy.mock.calls.map(([url]) => String(url));

describe("preview gallery", () => {
  it("has exactly one screen for every registry entry", () => {
    expect(Object.keys(PREVIEW_SCREENS).sort()).toEqual(PREVIEWS.map((p) => p.slug).sort());
  });

  it.each(PREVIEWS.map((p) => p.slug))(
    "renders %s as a labelled sample, and pressing its buttons reaches no server",
    async (slug) => {
      render(<PreviewScreen slug={slug} />);
      // A sample dialog opens modally, hiding the strip from assistive tech behind it.
      const note = screen.getByRole("note", { hidden: true });
      expect(note).toHaveTextContent("Nothing here is saved.");
      expect(screen.getByRole("link", { name: "All previews", hidden: true })).toHaveAttribute(
        "href",
        "/previews",
      );
      for (const button of screen.queryAllByRole("button")) {
        await act(async () => {
          fireEvent.click(button);
        });
      }
      for (const form of document.querySelectorAll("form")) fireEvent.submit(form);
      await act(async () => {});
      expect(requests().every((url) => url === STORY_PHOTO_PLACEHOLDER)).toBe(true);
    },
  );

  it("renders nothing for an unknown screen", () => {
    const { container } = render(<PreviewScreen slug="nope" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the gallery's own files away from server functions", () => {
    for (const file of [
      "src/components/previews/PreviewScreens.tsx",
      "src/components/previews/PreviewIndex.tsx",
      "src/lib/preview-samples.ts",
      "src/lib/preview-registry.ts",
    ]) {
      const valueImports = readFileSync(file, "utf8")
        .split(/;\s*\n/)
        .filter((stmt) => /from "@\/lib\/[\w-]+\.functions"/.test(stmt))
        .filter((stmt) => !/^\s*import type /m.test(stmt));
      expect(valueImports, file).toEqual([]);
    }
  });
});

describe("sample plate links", () => {
  it("stay inside the gallery for plates with a sample page", () => {
    render(
      <SamplePlateLink plateId="bc-lv2code" className="c">
        LV2CODE
      </SamplePlateLink>,
    );
    expect(screen.getByRole("link", { name: "LV2CODE" })).toHaveAttribute(
      "href",
      "/previews/plate-interpreted",
    );
  });

  it("don't navigate for plates without one", () => {
    render(
      <SamplePlateLink plateId="me-lobster" className="c">
        LOBSTER
      </SamplePlateLink>,
    );
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("LOBSTER")).toHaveClass("c");
  });
});

describe("sample story controls", () => {
  it("opens and closes the inert menu for your own and other stories", () => {
    render(<PreviewScreen slug="plate-interpreted" />);
    const own = screen.getByRole("button", { name: "More options for Traveler4821's story" });
    fireEvent.click(own);
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete my story" }));
    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "More options for maplegirl's story" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Report story" }));
    fireEvent.click(screen.getByRole("button", { name: "More options for maplegirl's story" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Block maplegirl" }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getAllByText("hearts").length).toBeGreaterThan(0);
  });

  it("reopens a closed sample dialog", () => {
    render(<PreviewScreen slug="story-delete" />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open the delete dialog" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("sample photo editor", () => {
  it("opens the real editor once the sample photo decodes", async () => {
    const close = vi.fn();
    decodePhoto.mockResolvedValue({ close });
    const { unmount } = render(<SamplePhotoEditor initialBox={null} />);
    expect(screen.getByRole("status")).toHaveTextContent("Opening the sample photo");
    expect(await screen.findByText("editor no box")).toBeInTheDocument();
    expect(fetchSpy).toHaveBeenCalledWith(STORY_PHOTO_PLACEHOLDER);
    unmount();
    expect(close).toHaveBeenCalled();
  });

  it("says so when this browser can't open the photo", async () => {
    render(<SamplePhotoEditor initialBox={{ x: 0, y: 0, w: 1, h: 1 }} />);
    expect(await screen.findByText("This browser couldn't open the sample photo.")).toBeVisible();
  });

  it("releases a photo that finishes decoding after the screen closes", async () => {
    const close = vi.fn();
    let finish: (v: unknown) => void = () => {};
    decodePhoto.mockReturnValue(new Promise((r) => (finish = r)));
    const { unmount } = render(<SamplePhotoEditor initialBox={null} />);
    await waitFor(() => expect(decodePhoto).toHaveBeenCalled());
    unmount();
    await act(async () => finish({ close }));
    expect(close).toHaveBeenCalled();
  });

  it("stays quiet when decoding fails after the screen closes", async () => {
    let fail: (e: unknown) => void = () => {};
    decodePhoto.mockReturnValue(new Promise((_, r) => (fail = r)));
    const { unmount } = render(<SamplePhotoEditor initialBox={null} />);
    await waitFor(() => expect(decodePhoto).toHaveBeenCalled());
    unmount();
    await act(async () => fail(new Error("late")));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("gallery index", () => {
  it("lists every sample screen and the live pages", () => {
    render(<PreviewIndex />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    for (const p of PREVIEWS) expect(hrefs).toContain(`/previews/${p.slug}`);
    expect(screen.getAllByRole("link", { name: /Live$/ })).toHaveLength(LIVE_PAGES.length);
    expect(screen.getByRole("heading", { name: "Plate page" })).toBeInTheDocument();
  });
});
