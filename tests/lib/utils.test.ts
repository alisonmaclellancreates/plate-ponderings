import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("lets later Tailwind classes win over conflicting earlier ones", () => {
    expect(cn("p-2 text-sm", "p-4")).toBe("text-sm p-4");
  });
  it("drops falsy values and merges conditional objects", () => {
    expect(cn("a", false, null, undefined, 0, "", { b: true, c: false })).toBe("a b");
  });
});
