import { describe, expect, it } from "vitest";
import { canContinueMeaning, frameMeaning } from "@/lib/story-form";

describe("speculative story meanings", () => {
  it("adds They might be when missing", () => {
    expect(frameMeaning("  a funeral director  ")).toBe("They might be a funeral director");
  });

  it("does not duplicate an existing prefix, regardless of case", () => {
    expect(frameMeaning("They might be single.")).toBe("They might be single.");
    expect(frameMeaning("they might be single.")).toBe("they might be single.");
    expect(frameMeaning("They might belong to a club.")).toBe(
      "They might be They might belong to a club.",
    );
  });

  it("requires an interpretation beyond the starter", () => {
    expect(canContinueMeaning("They might be ")).toBe(false);
    expect(canContinueMeaning("")).toBe(false);
    expect(canContinueMeaning("They might be ab")).toBe(false);
    expect(canContinueMeaning("They might be abc")).toBe(true);
  });

  it("keeps the complete framed meaning within 80 characters without truncation", () => {
    expect(frameMeaning("a".repeat(67))).toHaveLength(81);
    expect(canContinueMeaning("a".repeat(66))).toBe(true);
    expect(canContinueMeaning("a".repeat(67))).toBe(false);
    expect(canContinueMeaning(`They might be ${"a".repeat(66)}`)).toBe(true);
    expect(canContinueMeaning(`They might be ${"a".repeat(67)}`)).toBe(false);
  });
});
