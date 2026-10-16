import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlateDetail, Stories, orderStories } from "@/components/site/PlateDetail";
import type { Story } from "@/lib/mock-data";

const strip = () => screen.getByRole("list", { name: "Plate status" });

describe("PlateDetail", () => {
  it("mystery: prompt and sign, no summary, no stories list", () => {
    render(<PlateDetail state="mystery" />);
    expect(
      screen.getByRole("heading", { name: "What do you think this plate means?" }),
    ).toBeTruthy();
    expect(
      screen.getByText("Every story starts somewhere. Be the first to share yours!"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Your Story" })).toBeTruthy();
    expect(screen.getByTestId("roadside-sign").textContent).toBe(
      "Different roads. Different stories. What's yours?",
    );
    expect(screen.queryByText("The Story So Far")).toBeNull();
    expect(within(strip()).getByText("0 stories")).toBeTruthy();
    expect(within(strip()).getByText("Mystery")).toBeTruthy();
    expect(within(strip()).getByText("No owner yet")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to Explore" }).getAttribute("href")).toBe(
      "/explore",
    );
  });

  it("interpreted: summary meta, earlier count excludes current, oldest first, no more link", () => {
    render(<PlateDetail state="interpreted" />);
    expect(
      screen.getByText("AI-generated summary · Based on 5 stories · Updated Oct 12, 2026"),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Earlier summaries (3)" })).toBeTruthy();
    const handles = screen
      .getAllByRole("article")
      .map((a) => a.querySelector(".font-semibold")?.textContent);
    expect(handles).toEqual(["maplegirl", "northshore", "rivercat", "Traveler4821", "teadragon"]);
    expect(screen.queryByText(/more stor/)).toBeNull();
    expect(screen.getAllByRole("img", { name: /Photo shared by/ })).toHaveLength(1);
    expect(within(strip()).getByText("No owner yet")).toBeTruthy();
  });

  it("owner: attributes ownership, owner first, no earlier control, shows more", async () => {
    render(<PlateDetail state="owner" />);
    expect(screen.getByText(/a contributor who says it's their plate explains/)).toBeTruthy();
    expect(screen.queryByText(/Earlier summaries/)).toBeNull();
    expect(within(strip()).getByText("Owner: teadragon")).toBeTruthy();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(5);
    expect(cards[0]?.getAttribute("data-owner")).toBe("true");
    expect(within(cards[0]!).getByText("Owner weighed in")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Show 1 more story" }));
    expect(screen.getAllByRole("article")).toHaveLength(6);
  });

  it("history: expanded newest first, rows expand to text", async () => {
    render(<PlateDetail state="interpreted-history" />);
    const rows = within(document.getElementById("earlier-summaries")!).getAllByRole("listitem");
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringMatching(/Mixed views4 storiesOct 8, 2026/),
      expect.stringMatching(/Opinions differ3 storiesOct 5, 2026/),
      expect.stringMatching(/Mixed views2 storiesOct 3, 2026/),
    ]);
    const read = within(rows[0]!).getByRole("button", { name: "Read summary" });
    await userEvent.click(read);
    expect(
      within(rows[0]!).getByText(
        "Readers are split: half see love or live to code, half see a joke.",
      ),
    ).toBeTruthy();
    await userEvent.click(read);
    expect(
      within(rows[0]!).queryByText(
        "Readers are split: half see love or live to code, half see a joke.",
      ),
    ).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Earlier summaries (3)" }));
    expect(document.getElementById("earlier-summaries")).toBeNull();
  });

  it("pending: private panel, count unchanged", () => {
    render(<PlateDetail state="pending-story" />);
    expect(screen.getByText("Your story is waiting for its check.")).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe(
      "Your story is waiting for its check. Only you can see this for now.",
    );
    expect(within(strip()).getByText("5 stories")).toBeTruthy();
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  it("catching up: six published stories but summary still based on five", async () => {
    render(<PlateDetail state="catching-up" />);
    const panel = screen.getByRole("heading", { name: "The Story So Far" }).closest("section")!;
    expect(
      within(panel).getByText("New stories have arrived. The Story So Far is catching up."),
    ).toBeTruthy();
    expect(within(strip()).getByText("6 stories")).toBeTruthy();
    expect(within(panel).getByText(/Based on 5 stories/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Show 1 more story" }));
    const latest = screen.getAllByRole("article")[5];
    if (!latest) throw new Error("Missing newest story");
    expect(
      within(latest).getByText("Saw a laptop sticker in the back window: definitely a coder."),
    ).toBeTruthy();
    expect(within(latest).getByText(/Oct 14, 2026/)).toBeTruthy();
    expect(within(latest).getByText("maplegirl")).toBeTruthy();
  });
});

describe("Stories", () => {
  const mk = (id: string): Story => ({
    id,
    handle: id,
    date: "2026-10-01",
    meaning: id,
    howIKnow: "guess",
    hearts: 0,
  });

  it("offers 5 more when more than five remain past the first page", async () => {
    const stories = Array.from({ length: 11 }, (_, i) => mk(`s${i}`));
    render(<Stories stories={stories} pending={false} />);
    expect(screen.getAllByRole("article")).toHaveLength(5);
    await userEvent.click(screen.getByRole("button", { name: "Show 5 more stories" }));
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Show 1 more story" })).toBeTruthy();
  });
});

describe("orderStories", () => {
  it("never sorts by hearts; ties broken by id", () => {
    const mk = (id: string, date: string, hearts: number): Story => ({
      id,
      handle: id,
      date,
      meaning: id,
      howIKnow: "guess",
      hearts,
    });
    expect(
      orderStories([
        mk("b", "2026-01-01", 1),
        mk("a", "2026-01-01", 99),
        mk("c", "2025-01-01", 0),
      ]).map((s) => s.id),
    ).toEqual(["c", "a", "b"]);
  });
});
