import { describe, expect, it } from "vitest";
import { orderStories } from "@/lib/plate-detail";
import type { Story } from "@/lib/mock-data";

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
