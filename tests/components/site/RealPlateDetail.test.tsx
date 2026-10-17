import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  stories: null as unknown,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    className,
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    children: ReactNode;
    className?: string;
  }) => {
    const path = params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to;
    const qs = search ? `?${new URLSearchParams(search)}` : "";
    return (
      <a href={path + qs} className={className}>
        {children}
      </a>
    );
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: m.getUser } },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: m.stories }),
}));
vi.mock("@/lib/stories.functions", () => ({ getPlateStories: vi.fn() }));

import { RealPlateDetail } from "@/components/site/PlateDetail";

const plate = { id: "p1", jurisdiction: "Washington", text: "B7K 2L9" };

function story(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    meaning: `Meaning ${id}`,
    source: "guess",
    body: null,
    handle: `Traveler${id}`,
    hearts: 0,
    publishedAt: "2026-10-01",
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ data: { user: null } });
  m.stories = { stories: [], pending: [], storyCount: 0, hasOwnerStory: false, ownerHandle: null };
});

describe("RealPlateDetail", () => {
  it.each(["Newfoundland and Labrador", "Utah"])("uses the shared frame for %s", (jurisdiction) => {
    render(<RealPlateDetail plate={{ ...plate, jurisdiction }} />);
    const artwork = screen.getByRole("img", { name: `${jurisdiction} plate ${plate.text}` });
    const name = screen.getByText(jurisdiction, { selector: "p" });
    expect(artwork.nextElementSibling).toBe(name);
    expect(name.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the live plate as a mystery with no owner", () => {
    render(<RealPlateDetail plate={plate} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Washington plate B7K 2L9" }),
    ).toBeTruthy();
    const strip = screen.getByRole("list", { name: "Plate status" });
    expect(within(strip).getByText("0 stories")).toBeTruthy();
    expect(within(strip).getByText("Mystery")).toBeTruthy();
    expect(within(strip).getByText("No owner yet")).toBeTruthy();
  });

  it("shows the derived status and owner line from live stories", () => {
    m.stories = {
      stories: [story("1", { source: "owner", handle: "OwnerOne" })],
      pending: [],
      storyCount: 1,
      hasOwnerStory: true,
      ownerHandle: "OwnerOne",
    };
    render(<RealPlateDetail plate={plate} />);
    const strip = screen.getByRole("list", { name: "Plate status" });
    expect(within(strip).getByText("1 story")).toBeTruthy();
    expect(within(strip).getByText("Owner weighed in")).toBeTruthy();
    expect(within(strip).getByText("Owner: OwnerOne")).toBeTruthy();
  });

  it("lists published stories with handle, meaning, source badge and hearts", () => {
    m.stories = {
      stories: [
        story("1", { source: "knows_owner", handle: "Knower", hearts: 3, body: "Met them once." }),
      ],
      pending: [],
      storyCount: 1,
      hasOwnerStory: false,
      ownerHandle: null,
    };
    render(<RealPlateDetail plate={plate} />);
    expect(screen.getByText("Knower")).toBeInTheDocument();
    expect(screen.getByText("Meaning 1")).toBeInTheDocument();
    expect(screen.getByText("I know the owner")).toBeInTheDocument();
    expect(screen.getByText("Met them once.")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("pages five stories at a time with Show more", async () => {
    const user = userEvent.setup();
    const stories = Array.from({ length: 7 }, (_, i) => story(String(i + 1)));
    m.stories = { stories, pending: [], storyCount: 7, hasOwnerStory: false, ownerHandle: null };
    render(<RealPlateDetail plate={plate} />);
    expect(screen.getAllByRole("article")).toHaveLength(5);
    await user.click(screen.getByRole("button", { name: /Show 2 more stories/ }));
    expect(screen.getAllByRole("article")).toHaveLength(7);
    expect(screen.queryByRole("button", { name: /Show .* more/ })).toBeNull();
  });

  it("shows the private pending panel only when the viewer has pending stories", () => {
    m.stories = {
      stories: [],
      pending: [story("p", { meaning: "Waiting meaning" })],
      storyCount: 0,
      hasOwnerStory: false,
      ownerHandle: null,
    };
    render(<RealPlateDetail plate={plate} />);
    expect(screen.getByText(/Only you can see this for now/)).toBeInTheDocument();
  });

  it("offers Add Your Story only to signed-in visitors", async () => {
    const { unmount } = render(<RealPlateDetail plate={plate} />);
    await waitFor(() => expect(m.getUser).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Add Your Story" })).toBeNull();
    unmount();
    m.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    render(<RealPlateDetail plate={plate} />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Add Your Story" })).toHaveAttribute(
        "href",
        "/story/1?plate=p1",
      ),
    );
  });

  it("links Back to Search with the searched values when arriving from search", () => {
    render(
      <RealPlateDetail
        plate={plate}
        backToSearch={{ jurisdiction: "Washington", text: "B7K 2L9" }}
      />,
    );
    const back = screen.getByRole("link", { name: "Back to Search" });
    expect(back.getAttribute("href")).toBe("/?jurisdiction=Washington&text=B7K+2L9");
  });

  it("falls back to Explore without search values", () => {
    render(<RealPlateDetail plate={plate} />);
    expect(screen.getByRole("link", { name: "Back to Explore" }).getAttribute("href")).toBe(
      "/explore",
    );
  });
});
