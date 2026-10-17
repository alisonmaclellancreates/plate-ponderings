import { describe, expect, it } from "vitest";
import { headerModeFor } from "@/lib/header-mode";

describe("header modes", () => {
  it("maps preview paths to header modes", () => {
    expect(headerModeFor("/sign-in")).toBe("signed-out");
    expect(headerModeFor("/demo-form")).toBe("demo");
    expect(headerModeFor("/")).toBe("member");
  });
});
