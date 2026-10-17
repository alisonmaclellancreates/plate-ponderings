import { describe, expect, it } from "vitest";
import { normalizePlateText, plateKey } from "@/lib/plates";

describe("plate keys", () => {
  it("ignores spaces and dashes and uppercases", () => {
    expect(normalizePlateText("b7k 2l9")).toBe("B7K2L9");
    expect(plateKey("US-WA", "b7k 2l9")).toBe("US-WA|B7K2L9");
    expect(plateKey("US-WA", "B7K-2L9")).toBe("US-WA|B7K2L9");
  });
  it("keeps O and 0 as different characters", () => {
    expect(plateKey("US-WA", "O0")).not.toBe(plateKey("US-WA", "0O"));
  });
});
