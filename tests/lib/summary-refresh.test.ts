import { describe, expect, it } from "vitest";
import { requestSummaryRefresh } from "@/lib/summary-refresh.server";

describe("requestSummaryRefresh", () => {
  it("accepts a plate id and resolves with nothing until summaries are generated", async () => {
    await expect(requestSummaryRefresh("plate-1")).resolves.toBeUndefined();
  });
});
