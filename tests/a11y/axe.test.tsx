import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import * as matchers from "vitest-axe/matchers";
import "vitest-axe/extend-expect";
import type { ReactNode } from "react";

expect.extend(matchers);

const m = vi.hoisted(() => ({
  auth: null as null | { handle: string; isDemo: boolean; isAdmin: boolean },
  queryData: {} as Record<string, unknown>,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    children: ReactNode;
  }) => {
    const path = params ? to.replace(/\$(\w+)/g, (_, k: string) => params[k] ?? "") : to;
    const qs = search ? `?${new URLSearchParams(search)}` : "";
    return (
      <a {...props} href={path + qs}>
        {children}
      </a>
    );
  },
  useNavigate: () => vi.fn(),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => unknown }) =>
    select({ location: { pathname: "/" } }),
  useSearch: () => ({}),
  useParams: () => ({}),
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: m.queryData[queryKey[0] ?? ""],
    isPending: false,
  }),
  useSuspenseQuery: ({ queryKey }: { queryKey: string[] }) => ({
    data: m.queryData[queryKey[0] ?? ""],
  }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => ({ account: m.auth }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getUser: vi.fn(), signOut: vi.fn() } },
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/plates.functions", () => ({ searchPlate: vi.fn(), getPlate: vi.fn() }));
vi.mock("@/lib/stories.functions", () => ({
  getPlateStories: vi.fn(),
  addStory: vi.fn(),
  recheckStory: vi.fn(),
  STORY_PAGE_SIZE: 10,
}));
vi.mock("@/lib/summaries.functions", () => ({ getPlateSummary: vi.fn() }));
vi.mock("@/lib/plate-guesses.functions", () => ({ getPlateGuess: vi.fn() }));
vi.mock("@/lib/featured.functions", () => ({
  getFeaturedHome: vi.fn(),
  getFeaturedArchive: vi.fn(),
}));
vi.mock("@/lib/story-actions.functions", () => ({
  toggleHeart: vi.fn(),
  reportStory: vi.fn(),
  blockAuthor: vi.fn(),
  deleteMyStory: vi.fn(),
  getBlockedPeople: vi.fn(),
  unblockUser: vi.fn(),
}));
vi.mock("@/lib/submissions.functions", () => ({
  getUnreadDot: vi.fn(),
  getSubmissions: vi.fn(),
  dismissSubmission: vi.fn(),
}));
vi.mock("@/lib/photos.functions", () => ({
  detectPlateBox: vi.fn(),
  uploadStoryPhoto: vi.fn(),
}));
vi.mock("@/lib/accounts.functions", () => ({
  getAccount: vi.fn(),
  saveHandle: vi.fn(),
  signOutEverywhere: vi.fn(),
  getAiCheckStatus: vi.fn(async () => null),
  resumeAiChecks: vi.fn(),
}));
vi.mock("@/lib/account-delete.functions", () => ({ deleteMyAccount: vi.fn() }));
vi.mock("@/lib/admin.functions", () => ({
  getAdminOverview: vi.fn(),
  resumeAiChecks: vi.fn(),
  recheckStory: vi.fn(),
  getReportedStories: vi.fn(),
  setStoryHidden: vi.fn(),
  recheckAllPending: vi.fn(),
}));

import { Homepage } from "@/components/site/Homepage";
import { RealPlateDetail } from "@/components/site/PlateDetail";
import { AddStoryFlow } from "@/components/site/AddStoryFlow";
import { SignInPage, SignUpPage, SignInPromptPage } from "@/components/site/Entry";
import { SpotPage, SpotOutcomePage } from "@/components/site/SpotPlate";
import { SubmissionsPage } from "@/components/site/Account";
import { LiveSettings } from "@/components/site/LiveSettings";
import { LiveAdmin } from "@/components/site/LiveAdmin";
import { ReportDialog, DeleteStoryDialog } from "@/components/site/StoryMenu";
import { StoryPhotoZoom } from "@/components/site/StoryPhoto";
import { PhotoEditor } from "@/components/site/PhotoEditor";

// jsdom has no real layout or colour computation, so contrast is covered by
// the token table instead of axe.
const AXE_OPTS = { rules: { "color-contrast": { enabled: false } } } as const;

async function checkPage(ui: ReactNode) {
  // Pages render their own landmarks; the region rule stays on for these.
  const { container } = render(ui);
  expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
}

async function checkComponent(ui: ReactNode) {
  // Standalone component: no page landmarks, so the region rule is off here.
  const { container } = render(ui);
  expect(
    await axe(container, {
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    }),
  ).toHaveNoViolations();
}

const STORY = {
  id: "s1",
  handle: "maplegirl",
  meaning: "They might be a vet tech who loves pugs",
  more: "My neighbor's plate.",
  source: "knows_owner",
  hearts: 12,
  hearted: false,
  isOwn: false,
  photo: null,
  photoBox: null,
  createdAt: "2026-01-01",
};

beforeEach(() => {
  m.auth = { handle: "Traveler4821", isDemo: false, isAdmin: false };
  m.queryData = {};
});

describe("axe: full pages", () => {
  it("homepage", async () => {
    await checkPage(<Homepage />);
  });

  it("plate page with stories, summary history and a revealed guess", async () => {
    m.queryData = {
      "plate-stories": { stories: [STORY], pending: false },
      "plate-summary": {
        current: {
          version: 2,
          generatedAt: "2026-01-02T00:00:00Z",
          consensus: "mixed",
          storyCount: 3,
          text: "Two readings so far.",
        },
        earlier: [
          {
            version: 1,
            generatedAt: "2026-01-01T00:00:00Z",
            consensus: "agree",
            storyCount: 1,
            text: "One reading.",
          },
        ],
        catchingUp: false,
      },
      "plate-guess": { status: "revealed", text: "A playful guess." },
    };
    await checkPage(
      <RealPlateDetail plate={{ id: "p1", jurisdiction: "US-WA", text: "B7K2L9" }} />,
    );
  });

  it("mystery plate with the guess teaser", async () => {
    m.queryData = {
      "plate-stories": { stories: [], pending: false },
      "plate-guess": { status: "hidden" },
    };
    await checkPage(
      <RealPlateDetail plate={{ id: "p2", jurisdiction: "CA-ON", text: "MYSTERY" }} />,
    );
  });

  it("sign in", async () => {
    await checkPage(<SignInPage />);
  });

  it("sign up", async () => {
    await checkPage(<SignUpPage />);
  });

  it("sign-in prompt", async () => {
    await checkPage(<SignInPromptPage plateId="p1" />);
  });

  it("spot a plate", async () => {
    await checkPage(<SpotPage />);
  });

  it("spot outcomes", async () => {
    for (const outcome of ["exists", "new", "pending", "rejected", "already-spotted"] as const) {
      const { container, unmount } = render(<SpotOutcomePage outcome={outcome} />);
      expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
      unmount();
    }
  });

  it("your submissions", async () => {
    await checkPage(<SubmissionsPage rows={[]} />);
  });

  it("settings", async () => {
    await checkPage(<LiveSettings />);
  });

  it("admin", async () => {
    m.auth = { handle: "Traveler4821", isDemo: false, isAdmin: true };
    await checkPage(<LiveAdmin />);
  });
});

describe("axe: story form steps", () => {
  const preview = {
    plate: { id: "p1", jurisdiction: "Washington", text: "B7K 2L9" },
    draft: {
      how: "owner" as const,
      meaning: "They might be big fans of the Mariners.",
      more: "",
    },
    notice: { heading: null as string | null, message: "" },
  };

  it("step 1", async () => {
    await checkPage(<AddStoryFlow plateId="p1" preview={preview} />);
  });

  it("step 2", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddStoryFlow plateId="p1" preview={preview} />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });

  it("step 3", async () => {
    const user = userEvent.setup();
    const { container } = render(<AddStoryFlow plateId="p1" preview={preview} />);
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /continue without a photo/i }));
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });
});

// Radix focus guards are tabindex=0 spans with aria-hidden that only catch
// focus momentarily; in jsdom they trip aria-hidden-focus as a false positive.
const DIALOG_AXE_OPTS = {
  rules: {
    "color-contrast": { enabled: false },
    "aria-hidden-focus": { enabled: false },
  },
} as const;

describe("axe: dialogs (checked against document.body for the portal)", () => {
  it("report dialog", async () => {
    render(<ReportDialog open onOpenChange={() => {}} />);
    expect(await axe(document.body, DIALOG_AXE_OPTS)).toHaveNoViolations();
  });

  it("delete story dialog", async () => {
    render(<DeleteStoryDialog open onOpenChange={() => {}} />);
    expect(await axe(document.body, DIALOG_AXE_OPTS)).toHaveNoViolations();
  });

  it("photo zoom dialog", async () => {
    render(
      <StoryPhotoZoom
        photo="https://example.com/photo.jpg"
        handle="maplegirl"
        meaning="They might be cat lovers"
        box={{ x: 0.3, y: 0.4, w: 0.25, h: 0.12 }}
      />,
    );
    expect(await axe(document.body, DIALOG_AXE_OPTS)).toHaveNoViolations();
  });
});

describe("axe: photo editor", () => {
  it("with a suggested box", async () => {
    const bitmap = { width: 800, height: 600, close: vi.fn() } as unknown as ImageBitmap;
    await checkComponent(
      <PhotoEditor
        imageUrl="blob:mock"
        bitmap={bitmap}
        initialBox={{ x: 0.3, y: 0.4, w: 0.25, h: 0.12 }}
        showNoBoxMessage={false}
        onUse={() => {}}
        onRemove={() => {}}
        onChooseAnother={() => {}}
      />,
    );
  });
});
