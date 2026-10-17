import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  guess: { status: "absent" } as Record<string, unknown>,
  account: null as null | { handle: string; isDemo: boolean; isAdmin: boolean },
  getPlateStories: vi.fn(),
  summary: null as unknown,
  stories: null as unknown,
}));

vi.mock("@/lib/plate-guesses.functions", () => ({ getPlateGuess: () => Promise.resolve(m.guess) }));
vi.mock("@/lib/summaries.functions", () => ({ getPlateSummary: () => Promise.resolve(null) }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
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
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => ({ account: m.account }) }));
vi.mock("@/lib/story-actions.functions", () => ({
  toggleHeart: vi.fn(),
  reportStory: vi.fn(),
  blockAuthor: vi.fn(),
  deleteMyStory: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryFn, queryKey }: { queryFn: () => unknown; queryKey: string[] }) => {
    queryFn();
    return {
      data:
        queryKey[0] === "plate-guess"
          ? m.guess
          : queryKey[0] === "plate-summary"
            ? m.summary
            : m.stories,
    };
  },
}));
vi.mock("@/lib/stories.functions", () => ({
  getPlateStories: m.getPlateStories,
  STORY_PAGE_SIZE: 5,
}));

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
  m.account = null;
  m.guess = { status: "absent" };
  m.summary = null;
  m.stories = {
    stories: [],
    pending: [],
    total: 0,
    storyCount: 0,
    hasOwnerStory: false,
    ownerHandle: null,
  };
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
    expect(within(strip).getByText("No owner claim yet")).toBeTruthy();
    expect(
      screen.getByText("Every story starts somewhere. Be the first to share yours!"),
    ).toBeTruthy();
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
    expect(within(strip).getByText("Owner claim")).toBeTruthy();
    expect(within(strip).getByText("Says it's their plate: OwnerOne")).toBeTruthy();
    expect(screen.getByText("Have another interpretation? Add your story.")).toBeTruthy();
    expect(screen.queryByText(/Every story starts somewhere/)).toBeNull();
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
    m.stories = {
      stories,
      pending: [],
      total: 7,
      storyCount: 7,
      hasOwnerStory: false,
      ownerHandle: null,
    };
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

  it("sends signed-out visitors from both Add Your Story buttons to the sign-in prompt for this plate", async () => {
    m.stories = { ...(m.stories as object), stories: [story("1")], total: 1, storyCount: 1 };
    render(<RealPlateDetail plate={plate} />);
    expect(m.getUser).not.toHaveBeenCalled();
    const links = screen.getAllByRole("link", { name: "Add Your Story" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/sign-in-prompt?plate=p1");
  });

  it("sends signed-in visitors from both buttons straight to the story form", async () => {
    m.account = { handle: "Traveler1234", isDemo: false, isAdmin: false };
    render(<RealPlateDetail plate={plate} />);
    await waitFor(() => {
      const links = screen.getAllByRole("link", { name: "Add Your Story" });
      expect(links).toHaveLength(2);
      for (const link of links) expect(link).toHaveAttribute("href", "/story/1?plate=p1");
    });
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

  it("every part of the page reads stories for this plate only", () => {
    render(<RealPlateDetail plate={plate} />);
    expect(m.getPlateStories).toHaveBeenCalled();
    for (const c of m.getPlateStories.mock.calls) expect(c[0]).toEqual({ data: { plateId: "p1" } });
  });

  it("says heart and story in the singular", async () => {
    const user = userEvent.setup();
    m.stories = {
      stories: Array.from({ length: 6 }, (_, i) => story(String(i), { hearts: i === 0 ? 1 : 2 })),
      pending: [],
      total: 6,
      storyCount: 6,
      hasOwnerStory: false,
      ownerHandle: null,
    };
    render(<RealPlateDetail plate={plate} />);
    expect(screen.getAllByText("heart")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Show 1 more story" }));
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("follows account changes without making its own auth request", () => {
    const view = render(<RealPlateDetail plate={plate} />);
    m.account = { handle: "Traveler1234", isDemo: false, isAdmin: false };
    view.rerender(<RealPlateDetail plate={plate} />);
    for (const link of screen.getAllByRole("link", { name: "Add Your Story" }))
      expect(link).toHaveAttribute("href", "/story/1?plate=p1");
    m.account = null;
    m.guess = { status: "absent" };
    view.rerender(<RealPlateDetail plate={plate} />);
    for (const link of screen.getAllByRole("link", { name: "Add Your Story" }))
      expect(link).toHaveAttribute("href", "/sign-in-prompt?plate=p1");
    expect(m.getUser).not.toHaveBeenCalled();
  });
});

it("hidden guesses do not alter counts and pending human stories do not unlock them", () => {
  m.guess = { status: "hidden" };
  m.summary = {
    current: {
      version: 1,
      generatedAt: "2026-10-01",
      consensus: "agree",
      storyCount: 1,
      text: "A stale summary",
    },
    earlier: [],
    catchingUp: false,
  };
  m.stories = { ...(m.stories as object), pending: [story("pending")] };
  render(<RealPlateDetail plate={plate} />);
  expect(
    within(screen.getByRole("list", { name: "Plate status" })).getByText("0 stories"),
  ).toBeTruthy();
  expect(screen.queryByRole("region", { name: "What the Plate?'s guess" })).toBeNull();
  expect(screen.getByText("We've got a guess waiting.")).toBeInTheDocument();
  expect(screen.queryByText("A stale summary")).toBeNull();
});
it("revealed guesses do not become human stories or change owner-first order", () => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  m.guess = { status: "revealed", meaning: "Imagined meaning", story: "Imagined fiction." };
  m.stories = {
    stories: [story("owner", { source: "owner" }), story("guess")],
    pending: [],
    total: 2,
    storyCount: 2,
    hasOwnerStory: true,
    ownerHandle: "owner",
  };
  render(<RealPlateDetail plate={plate} />);
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getAllByRole("article")[0]).toHaveAttribute("data-owner", "true");
  expect(
    within(screen.getByRole("list", { name: "Plate status" })).getByText("2 stories"),
  ).toBeTruthy();
  vi.unstubAllGlobals();
});
