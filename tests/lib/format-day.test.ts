import { describe, expect, it } from "vitest";
import { formatDay } from "@/lib/format-day";

describe("formatDay", () => {
  it("formats days without time zones", () => {
    expect(formatDay("2026-10-15")).toBe("Oct 15, 2026");
  });

  it("reads the same in every month and single-digit day", () => {
    expect(formatDay("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDay("2026-09-26")).toBe("Sep 26, 2026");
    expect(formatDay("2026-12-31")).toBe("Dec 31, 2026");
  });
});
