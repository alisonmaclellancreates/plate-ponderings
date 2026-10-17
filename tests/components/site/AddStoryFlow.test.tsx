import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  close: vi.fn(),
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
  m.decode.mockResolvedValue({ width: 800, height: 600, close: m.close });
  m.detect.mockResolvedValue({ outcome: "ok", box: { x: 0.3, y: 0.4, w: 0.25, h: 0.12 } });
  m.renderBlurred.mockResolvedValue(undefined);
  m.toJpeg.mockResolvedValue(new Blob(["jpeg"], { type: "image/jpeg" }));
  m.upload.mockResolvedValue({ outcome: "ok", path: "user-1/photo.jpg" });
  m.renderBlurred.mockReturnValue(document.createElement("canvas"));
  URL.revokeObjectURL = vi.fn();
  URL.createObjectURL = vi.fn(() => "blob:mock");
});

/** Choose a photo, confirm the suggested box, and land back on step 2. */
async function addPhoto(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Next" }));
  const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
  await user.upload(document.getElementById("story-photo") as HTMLInputElement, file);
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Adjust the plate area" })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Next" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Review your photo" })).toBeInTheDocument(),
  );
  await user.click(screen.getByRole("button", { name: "Use This Photo" }));
  await waitFor(() =>
    expect(
      screen.getByAltText("Your processed photo, blurred except the plate"),
    ).toBeInTheDocument(),
  );
}

describe("AddStoryFlow", () => {
  it("cancelled file selection does nothing", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "single.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(document.getElementById("story-photo") as HTMLInputElement, {
      target: { files: [] },
    });
    expect(m.decode).not.toHaveBeenCalled();
  });

  it("a thrown detection failure still opens manual adjustment", async () => {
    m.detect.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "single.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.upload(
      document.getElementById("story-photo") as HTMLInputElement,
      new File(["x"], "x.jpg", { type: "image/jpeg" }),
    );
    await screen.findByRole("dialog");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText(/We couldn't find the plate in this photo/)).toBeInTheDocument();
  });

  it("disposes a stale detection result after unmount", async () => {
    let resolve: ((result: unknown) => void) | undefined;
    m.detect.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const user = userEvent.setup();
    const { unmount } = render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "single.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.upload(
      document.getElementById("story-photo") as HTMLInputElement,
      new File(["x"], "x.jpg", { type: "image/jpeg" }),
    );
    await waitFor(() => expect(m.detect).toHaveBeenCalled());
    unmount();
    await act(async () => {
      resolve?.({ outcome: "ok", box: null });
    });
    expect(m.close).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(m.upload).not.toHaveBeenCalled();
  });

  it.each(["returned", "thrown"])(
    "a %s upload failure closes the editor and allows continuing without a photo",
    async (kind) => {
      if (kind === "returned") m.upload.mockResolvedValue({ outcome: "error" });
      else m.upload.mockRejectedValue(new Error("offline"));
      const user = userEvent.setup();
      render(<AddStoryFlow plateId="p1" />);
      await user.type(screen.getByLabelText(/What do you think it means/), "single.");
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.upload(
        document.getElementById("story-photo") as HTMLInputElement,
        new File(["x"], "x.jpg", { type: "image/jpeg" }),
      );
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Next" }));
      await screen.findByRole("heading", { name: "Review your photo" });
      await user.click(screen.getByRole("button", { name: "Use This Photo" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(m.close).toHaveBeenCalledTimes(1);
      expect(m.track).not.toHaveBeenCalledWith("photo_added", expect.anything());
      await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
      await user.click(screen.getByRole("button", { name: "Submit Story" }));
      await waitFor(() =>
        expect(m.submit).toHaveBeenCalledWith({ data: expect.objectContaining({ photoPath: "" }) }),
      );
    },
  );

  it("removing a confirmed photo clears its submitted path", async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:original")
      .mockReturnValueOnce("blob:editor-review")
      .mockReturnValueOnce("blob:processed");
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "single.");
    await addPhoto(user);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:processed");
    await user.click(screen.getByRole("button", { name: "Remove Photo" }));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:processed");
    expect(
      screen.queryByAltText("Your processed photo, blurred except the plate"),
    ).not.toBeInTheDocument();
    expect(m.track).toHaveBeenCalledWith("photo_skipped", {});
    await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(m.submit).toHaveBeenCalledWith({ data: expect.objectContaining({ photoPath: "" }) }),
    );
  });

  it("replacing a confirmed photo releases only the previous preview until unmount", async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:original-1")
      .mockReturnValueOnce("blob:editor-review-1")
      .mockReturnValueOnce("blob:processed-1")
      .mockReturnValueOnce("blob:original-2")
      .mockReturnValueOnce("blob:editor-review-2")
      .mockReturnValueOnce("blob:processed-2");
    const user = userEvent.setup();
    const { unmount } = render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "single.");
    await addPhoto(user);
    await user.click(screen.getByRole("button", { name: "Remove Photo" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await addPhoto(user);
    expect(screen.getByAltText("Your processed photo, blurred except the plate")).toHaveAttribute(
      "src",
      "blob:processed-2",
    );
    expect(
      vi.mocked(URL.revokeObjectURL).mock.calls.filter(([url]) => url === "blob:processed-1"),
    ).toHaveLength(1);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:processed-2");
    unmount();
    expect(
      vi.mocked(URL.revokeObjectURL).mock.calls.filter(([url]) => url === "blob:processed-2"),
    ).toHaveLength(1);
  });

  it("unmount releases a confirmed preview but step changes keep it alive", async () => {
    vi.mocked(URL.createObjectURL)
      .mockReturnValueOnce("blob:original")
      .mockReturnValueOnce("blob:editor-review")
      .mockReturnValueOnce("blob:processed");
    const user = userEvent.setup();
    const { unmount } = render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "single.");
    await addPhoto(user);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith("blob:processed");
    unmount();
    expect(
      vi.mocked(URL.revokeObjectURL).mock.calls.filter(([url]) => url === "blob:processed"),
    ).toHaveLength(1);
  });
  it("requires more than the prefilled starter before continuing", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    const input = screen.getByLabelText(/What do you think it means/);
    expect(input).toHaveValue("They might be ");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.type(input, "single.");
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it.each([
    ["a funeral director", "They might be a funeral director"],
    ["They might be a funeral director", "They might be a funeral director"],
    ["they might be single.", "they might be single."],
  ])("frames %s consistently for review and submission", async (entered, expected) => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.clear(screen.getByLabelText(/What do you think it means/));
    await user.type(screen.getByLabelText(/What do you think it means/), entered);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
    expect(screen.getByText(expected)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() =>
      expect(m.submit).toHaveBeenCalledWith({
        data: { plateId: "p1", meaning: expected, source: "owner", more: "", photoPath: "" },
      }),
    );
  });

  it("does not allow adding a missing prefix to overflow the meaning limit", async () => {
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    const input = screen.getByLabelText(/What do you think it means/);
    await user.clear(input);
    await user.type(input, "a".repeat(67));
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(m.submit).not.toHaveBeenCalled();
  });

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
        meaning: "They might be Pacific Northwest love.",
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
      "They might be Pacific Northwest love.",
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
      "They might be Pacific Northwest love.",
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
      data: { jpeg: "data:image/jpeg;base64,processed" },
    });
    expect(m.track).toHaveBeenCalledWith("photo_added", { box_found: true, box_adjusted: false });
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByAltText("Your blurred photo")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit Story" }));
    await waitFor(() => expect(screen.getByText("Story submitted!")).toBeInTheDocument());
    expect(m.submit).toHaveBeenCalledWith({
      data: {
        plateId: "p1",
        meaning: "They might be Pacific Northwest love.",
        source: "owner",
        more: "",
        photoPath: "user-1/photo.jpg",
      },
    });
  });

  it.each(["rejected", "error", "validation"] as const)(
    "a %s outcome forgets the deleted photo, so a retry never sends its path",
    async (first) => {
      vi.mocked(URL.createObjectURL)
        .mockReturnValueOnce("blob:original")
        .mockReturnValueOnce("blob:editor-review")
        .mockReturnValueOnce("blob:processed");
      m.submit.mockResolvedValueOnce({ outcome: first });
      const user = userEvent.setup();
      render(<AddStoryFlow plateId="p1" />);
      await user.type(
        screen.getByLabelText(/What do you think it means/),
        "They might be Pacific Northwest love.",
      );
      await addPhoto(user);
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.click(screen.getByRole("button", { name: "Submit Story" }));
      await waitFor(() => expect(m.submit).toHaveBeenCalledTimes(1));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:processed");
      expect(m.submit.mock.calls[0]?.[0]?.data.photoPath).toBe("user-1/photo.jpg");
      await user.click(screen.getByRole("button", { name: "Next" }));
      await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
      await user.click(screen.getByRole("button", { name: "Submit Story" }));
      await waitFor(() => expect(m.submit).toHaveBeenCalledTimes(2));
      expect(m.submit.mock.calls[1]?.[0]?.data.photoPath).toBe("");
    },
  );

  it("detection unavailable goes straight to draw-a-box with the no-box message", async () => {
    m.detect.mockResolvedValue({ outcome: "unavailable" });
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "Pacific Northwest love.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(document.getElementById("story-photo") as HTMLInputElement, file);
    await waitFor(() =>
      expect(
        screen.getByText(
          "We couldn't find the plate in this photo. Draw a box around it to keep it clear.",
        ),
      ).toBeInTheDocument(),
    );
  });

  it("opens a cleared picker, preserves the editor on cancel, and detects the same file when selected again", async () => {
    m.detect.mockResolvedValue({ outcome: "ok", box: null });
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "Pacific Northwest love.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    const input = document.getElementById("story-photo") as HTMLInputElement;
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(input, file);
    await screen.findByRole("dialog");
    const click = vi.spyOn(input, "click");
    await user.click(screen.getByRole("button", { name: "Choose another photo" }));
    expect(click).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(m.detect).toHaveBeenCalledTimes(1);
    expect(m.close).not.toHaveBeenCalled();
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await user.upload(input, file);
    await waitFor(() => expect(m.detect).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(m.close).toHaveBeenCalledTimes(1));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    expect(m.upload).not.toHaveBeenCalled();
  });

  it.each([null, { x: 0.3, y: 0.4, w: 0.25, h: 0.12 }])(
    "skipping adjustment with box %o frees the photo and returns to the photo step without uploading",
    async (box) => {
      m.detect.mockResolvedValue({ outcome: "ok", box });
      const user = userEvent.setup();
      render(<AddStoryFlow plateId="p1" />);
      await user.type(
        screen.getByLabelText(/What do you think it means/),
        "Pacific Northwest love.",
      );
      await user.click(screen.getByRole("button", { name: "Next" }));
      const input = document.getElementById("story-photo") as HTMLInputElement;
      await user.upload(input, new File(["photo"], "photo.jpg", { type: "image/jpeg" }));
      await screen.findByRole("dialog");
      await user.click(screen.getByRole("button", { name: "Skip photo" }));
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(input.value).toBe("");
      expect(m.close).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
      expect(m.track.mock.calls.filter(([event]) => event === "photo_skipped")).toEqual([
        ["photo_skipped", {}],
      ]);
      expect(m.upload).not.toHaveBeenCalled();
      expect(m.toJpeg).not.toHaveBeenCalled();
      await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
      await user.click(screen.getByRole("button", { name: "Submit Story" }));
      await waitFor(() =>
        expect(m.submit).toHaveBeenCalledWith({ data: expect.objectContaining({ photoPath: "" }) }),
      );
    },
  );

  it("an unreadable photo shows the message and lets the visitor continue", async () => {
    m.decode.mockRejectedValue(new Error("bad file"));
    const user = userEvent.setup();
    render(<AddStoryFlow plateId="p1" />);
    await user.type(screen.getByLabelText(/What do you think it means/), "Pacific Northwest love.");
    await user.click(screen.getByRole("button", { name: "Next" }));
    const file = new File(["nope"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(document.getElementById("story-photo") as HTMLInputElement, file);
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
        "They might be Pacific Northwest love.",
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
      "They might be Pacific Northwest love.",
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
          meaning: "They might be Pacific Northwest love.",
          source: "guess",
          more: "Seen near Seattle.",
          photoPath: "",
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
          draft: {
            how: "mystery" as never,
            meaning: "They might be Pacific Northwest love.",
            more: "",
          },
          notice: { heading: null, message: "note" },
        }}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Continue without a photo" }));
    expect(screen.getByText("mystery")).toBeInTheDocument();
  });
});
