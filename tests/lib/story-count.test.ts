import { describe, expect, it } from "vitest";
import { storyCount } from "@/lib/story-count";

describe("storyCount", () => {
  it("pluralizes 0, 1 and several", () => {
    expect(storyCount(0)).toBe("0 stories");
    expect(storyCount(1)).toBe("1 story");
    expect(storyCount(5)).toBe("5 stories");
  });
});
