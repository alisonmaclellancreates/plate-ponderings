import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode, type ReactNode } from "react";

const m = vi.hoisted(() => ({
  submit: vi.fn(),
  getPlate: vi.fn(),
  getPlateStories: vi.fn(),
  track: vi.fn(),
  navigate: vi.fn(),
  detect: vi.fn(),
  upload: vi.fn(),
  decode: vi.fn(),
  renderBlurred: vi.fn(),
  toJpeg: vi.fn(),
  auth: { account: null as null | { handle: string; isDemo: boolean; isAdmin: boolean } },
  plate: { plate: { id: "p1", jurisdiction: "Washington", text: "B7K 2L9" } } as unknown,
  stories: { hasOwnerStory: false } as unknown,
}));

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
  }) => (
    <a
      className={className}
      href={params ? to.replace(/\$(\w+)/, (_, k: string) => params[k] ?? "") : to}
    >
      {children}
    </a>
  ),
  useNavigate: () => m.navigate,
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({
    queryKey,
    queryFn,
    enabled,
  }: {
    queryKey: string[];
    queryFn: () => unknown;
    enabled?: boolean;
  }) => {
    if (enabled !== false) queryFn();
    return { data: queryKey[0] === "plate" ? m.plate : m.stories };
  },
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/plates.functions", () => ({ getPlate: m.getPlate }));
vi.mock("@/lib/stories.functions", () => ({
  addStory: m.submit,
  getPlateStories: m.getPlateStories,
}));
vi.mock("@/lib/account-auth", () => ({ useAccountAuth: () => m.auth }));
vi.mock("@/lib/analytics", () => ({ track: m.track }));
vi.mock("@/lib/photos.functions", () => ({
  detectPlateBox: m.detect,
  uploadStoryPhoto: m.upload,
}));
vi.mock("@/lib/photo-canvas", () => ({
  decodePhoto: m.decode,
  renderBlurredPhoto: m.renderBlurred,
  canvasToJpegBlob: m.toJpeg,
  toDetectDataUrl: vi.fn(() => "data:image/jpeg;base64,detect"),
  blobToDataUrl: vi.fn(async () => "data:image/jpeg;base64,processed"),
}));

import { AddStoryFlow } from "@/components/site/AddStoryFlow";
import { RATE_LIMIT_MESSAGE } from "@/lib/account-rules";

async function fillAndReview(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/What do you think it means/), "Pacific Northwest love.");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  m.auth.account = { handle: "Traveler4821", isDemo: false, isAdmin: false };
  m.plate = { plate: { id: "p1", jurisdiction: "Washington", text: "B7K 2L9" } };
  m.stories = { hasOwnerStory: false };
  m.submit.mockResolvedValue({ outcome: "published" });
  m.decode.mockResolvedValue({ width: 800, height: 600 });
  m.detect.mockResolvedValue({ outcome: "ok", box: { x: 0.3, y: 0.4, w: 0.25, h: 0.12 } });
  m.renderBlurred.mockResolvedValue(undefined);
  m.toJpeg.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  m.upload.mockResolvedValue({ path: "user-1/photo.jpg" });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    filter: "",
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  URL.createObjectURL = vi.fn(() => "blob:mock");
});

/** Choose a photo, confirm the suggested box, and land back on step 2. */
async function addPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Next" }));
  const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
  await user.upload(screen.getByLabelText(/Choose a photo/i), file);
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Adjust the plate area" })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Review your photo" })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Use This Photo" }));
  await waitFor(() =>
    expect(screen.getByAltText("Your processed photo, blurred except the plate")).toBeInTheDocument(),
  );
}

describe("AddStoryFlow", () => {
  it("tracks story_started once on mount", () => {
    render(<AddStoryFlow plateId="p1" />);
    expect(m.track).toHaveBeenCalledWith("story_started", {});
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it("walks the three steps and submits, landing on the published outcome", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    expect(screen.getByText("How I know")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() => expect(screen.getByText("Story submitted!")).toBeInTheDocument());
    expect(m.submit).toHaveBeenCalledWith({
      data: {
        plateId: "p1",
        meaning: "Pacific Northwest love.",
        source: "owner",
        more: "",
        photoPath: "",
      },
    });
    expect(m.track).toHaveBeenCalledWith("story_submitted", {
      source: "owner",
      has_more_text: false,
      outcome: "published",
    });
    expect(screen.getByRole("link", { name: "View This Plate" })).toHaveAttribute(
      "href",
      "/plate/p1",
    );
  });

  it("shows the owner note when the plate already has an owner story", () => {
    m.stories = { hasOwnerStory: true };
    render(<AddStoryFlow plateId="p1" />);
    expect(screen.getByText(/Yours will appear alongside theirs/)).toBeInTheDocument();
  });

  it("a rejected story keeps the writer's words and explains", async () => {
    m.submit.mockResolvedValue({ outcome: "rejected" });
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(screen.getByText("We couldn't add this story.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
      "Pacific Northwest love.",
    );
    expect(m.track).toHaveBeenCalledWith(
      "story_submitted",
      expect.objectContaining({ outcome: "rejected" }),
    );
  });

  it("a pending story lands on the checking outcome", async () => {
    m.submit.mockResolvedValue({ outcome: "pending" });
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(screen.getByText("Your story is being checked.")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: "Go to Your Submissions" })).toHaveAttribute(
      "href",
      "/submissions",
    );
  });

  it("a rate limit is recorded as rate_limited and shows the wait message", async () => {
    m.submit.mockResolvedValue({
      outcome: "rate-limited",
      message: "You've done that a lot in a short time. Please wait a while and try again.",
    });
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(screen.getByText(/Please wait a while and try again/)).toBeInTheDocument(),
    );
    expect(screen.getByText("Let's pause a moment.")).toBeInTheDocument();
    expect(m.track).toHaveBeenCalledWith(
      "story_submitted",
      expect.objectContaining({ outcome: "rate_limited" }),
    );
  });

  it("a thrown failure is recorded as error with the generic message", async () => {
    m.submit.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(screen.getByText("Hmm... something went wrong.")).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        "We couldn't submit your story right now. Your words are still here. Please try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
      "Pacific Northwest love.",
    );
    expect(m.track).toHaveBeenCalledWith(
      "story_submitted",
      expect.objectContaining({ outcome: "error" }),
    );
  });

  it("the demo account sees the form with every control disabled", () => {
    m.auth.account = { handle: "Traveler4821", isDemo: true, isAdmin: false };
    render(<AddStoryFlow plateId="p1" />);
    expect(screen.getByText("Adding stories is turned off in the demo.")).toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.getByLabelText(/What do you think it means/)).toBeDisabled();
    expect(screen.getByRole("textbox", { name: /Tell us more/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(m.submit).not.toHaveBeenCalled();
  });

  it("renders nothing while the plate is loading", () => {
    m.plate = undefined;
    const { container } = render(<AddStoryFlow plateId="p1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("tracks photo_skipped when continuing without a photo", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    expect(m.track).toHaveBeenCalledWith("photo_skipped", {});
  });

  it("a confirmed photo is uploaded, shown at review, and submitted with the story", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "Pacific Northwest love.");
    await addPhoto(user);
    expect(m.upload).toHaveBeenCalledWith({
      data: { dataUrl: expect.stringMatching(/^data:image\/jpeg/) },
    });
    expect(m.track).toHaveBeenCalledWith("photo_added", { box_found: true, box_adjusted: false });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByAltText("Your blurred photo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() => expect(screen.getByText("Story submitted!")).toBeInTheDocument());
    expect(m.submit).toHaveBeenCalledWith({
      data: {
        plateId: "p1",
        meaning: "Pacific Northwest love.",
        source: "owner",
        more: "",
        photoPath: "user-1/photo.jpg",
      },
    });
  });

  it("detection unavailable goes straight to draw-a-box with the no-box message", async () => {
    m.detect.mockResolvedValue({ outcome: "unavailable" });
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/Choose a photo/i), file);
    await waitFor(() =>
      expect(
        screen.getByText(
          "We couldn't find the plate in this photo. Draw a box around it to keep it clear.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("an unreadable photo shows the message and lets the visitor continue", async () => {
    m.decode.mockRejectedValue(new Error("bad file"));
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    const file = new File(["nope"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText(/Choose a photo/i), file);
    await waitFor(() =>
      expect(
        screen.getByText(
          "We couldn't read this photo. You can choose another, or continue without one.",
        ),
      ).toBeInTheDocument(),
    );
    expect(m.detect).not.toHaveBeenCalled();
    expect(m.upload).not.toHaveBeenCalled();
  });
});

describe("AddStoryFlow preview mode", () => {
  const preview = {
    plate: { id: "preview-story-states", jurisdiction: "Oregon", text: "PNW LV" },
    draft: {
      how: "owner" as const,
      meaning: "Pacific Northwest love.",
      more: "I grew up near Portland and wanted a plate that says where my heart is.",
    },
    notice: {
      heading: "Hmm... something went wrong." as string | null,
      message:
        "We couldn't submit your story right now. Your words are still here. Please try again.",
    },
  };

  it("shows the error notice and the kept draft, and submitting calls nothing", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="preview-story-states" preview={preview} />);
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Hmm... something went wrong.");
    expect(status).toHaveTextContent(
      "We couldn't submit your story right now. Your words are still here. Please try again.",
    );
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
      "Pacific Northwest love.",
    );
    expect(screen.getByRole("textbox", { name: /Tell us more/ })).toHaveValue(
      "I grew up near Portland and wanted a plate that says where my heart is.",
    );
    expect(screen.getByRole("radio", { name: /It's my plate/ })).toBeChecked();
    expect(m.track).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    expect(m.submit).not.toHaveBeenCalled();
    expect(m.track).not.toHaveBeenCalled();
  });

  it("shows the pause heading and wait message with the kept draft", () => {
    render(
      <AddStoryFlow
        plateId="preview-story-states"
        preview={{
          ...preview,
          notice: { heading: "Let's pause a moment.", message: RATE_LIMIT_MESSAGE },
        }}
      />,
    );
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Let's pause a moment.");
    expect(status).toHaveTextContent(RATE_LIMIT_MESSAGE);
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
      "Pacific Northwest love.",
    );
    expect(m.track).not.toHaveBeenCalled();
  });
});

describe("AddStoryFlow branches", () => {
  async function submitWith(result: unknown) {
    m.submit.mockResolvedValue(result);
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    return user;
  }

  it("reads this plate and its stories by id", () => {
    render(<AddStoryFlow plateId="p1" />);
    expect(m.getPlate).toHaveBeenCalledWith({ data: { id: "p1" } });
    expect(m.getPlateStories).toHaveBeenCalledWith({ data: { plateId: "p1" } });
  });

  it("tracks story_started only once, even when effects run twice", () => {
    const { rerender } = render(
      <StrictMode>
        <AddStoryFlow plateId="p1" />
      </StrictMode>,
    );
    rerender(
      <StrictMode>
        <AddStoryFlow plateId="p1" />
      </StrictMode>,
    );
    expect(m.track).toHaveBeenCalledTimes(1);
  });

  it("shows no owner note while the stories are still loading", () => {
    m.stories = undefined;
    render(<AddStoryFlow plateId="p1" />);
    expect(screen.queryByText(/Yours will appear alongside theirs/)).toBeNull();
  });

  it("a demo refusal shows its message without a heading, tracked as error", async () => {
    await submitWith({
      outcome: "demo",
      message: "Adding plates and stories is turned off in the demo.",
    });
    const status = await screen.findByRole("status");
    expect(status.children).toHaveLength(1);
    expect(status.firstElementChild).toHaveClass("font-semibold");
    expect(status).toHaveTextContent("Adding plates and stories is turned off in the demo.");
    expect(m.track).toHaveBeenCalledWith(
      "story_submitted",
      expect.objectContaining({ outcome: "error" }),
    );
  });

  it.each([{ outcome: "validation" }, { outcome: "error" }])(
    "a %o result shows the error notice and keeps the draft",
    async (result) => {
      await submitWith(result);
      const status = await screen.findByRole("status");
      expect(status).toHaveTextContent("Hmm... something went wrong.");
      expect(status).toHaveTextContent(
        "We couldn't submit your story right now. Your words are still here. Please try again.",
      );
      expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
        "Pacific Northwest love.",
      );
      expect(m.track).toHaveBeenCalledWith(
        "story_submitted",
        expect.objectContaining({ outcome: "error" }),
      );
    },
  );

  it("Back returns from review to photo, and from photo to the kept draft", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await fillAndReview(user);
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Add a photo (optional)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/What do you think it means/)).toHaveValue(
      "Pacific Northwest love.",
    );
  });

  it("submits the picked source and the extra text", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.click(screen.getByRole("radio", { name: /My best guess/ }));
    await user.type(screen.getByRole("textbox", { name: /Tell us more/ }), "Seen near Seattle.");
    await fillAndReview(user);
    expect(screen.getByText("My best guess")).toBeInTheDocument();
    expect(screen.getByText("Seen near Seattle.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(m.submit).toHaveBeenCalledWith({
        data: {
          plateId: "p1",
          meaning: "Pacific Northwest love.",
          source: "guess",
          more: "Seen near Seattle.",
        },
      }),
    );
    expect(m.track).toHaveBeenCalledWith("story_submitted", {
      source: "guess",
      has_more_text: true,
      outcome: "published",
    });
  });

  it("review shows an unknown source key as itself", async () => {
    const user = userEvent.setup();
    render(
      <AddStoryFlow
        plateId="x"
        preview={{
          plate: { id: "x", jurisdiction: "Oregon", text: "PNW LV" },
          draft: { how: "mystery" as never, meaning: "Pacific Northwest love.", more: "" },
          notice: { heading: null, message: "note" },
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
    expect(screen.getByText("mystery")).toBeInTheDocument();
  });
});
