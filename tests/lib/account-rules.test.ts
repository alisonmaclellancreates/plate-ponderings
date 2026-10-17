import { describe, expect, it } from "vitest";
import {
  handleFormatValid,
  RESERVED_HANDLES,
  safeReturnPath,
  signupErrorMessage,
  handleBlockCategory,
} from "@/lib/account-rules";

describe("handle rules", () => {
  it("allows 3 through 20 ASCII letters, numbers and underscores", () => {
    expect(handleFormatValid("a_9")).toBe(true);
    expect(handleFormatValid("a".repeat(20))).toBe(true);
    for (const value of ["ab", "a".repeat(21), "a b", "a-b", "éabc", "abc\n"])
      expect(handleFormatValid(value)).toBe(false);
  });
  it("rejects every reserved handle ignoring case and the demo handle", () => {
    for (const value of [...RESERVED_HANDLES, "Traveler4821"])
      expect(handleFormatValid(value.toUpperCase())).toBe(false);
    expect(handleFormatValid("Traveler4822")).toBe(true);
  });
});
describe("return paths", () => {
  it("preserves same-site paths and rejects external and encoded escape paths", () => {
    expect(safeReturnPath("/profile?tab=one#handle")).toBe("/profile?tab=one#handle");
    for (const value of [
      undefined,
      42,
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/%2fevil.example",
      "/%5cevil",
      "/%00foo",
      "/profile\n",
      "/bad%",
      "/auth",
      "/sign-in?returnTo=/profile",
      "/sign-up",
    ])
      expect(safeReturnPath(value)).toBe("/");
  });
});
describe("gateway blocks", () => {
  it("blocks explicit credit denials and provider access denials only", () => {
    expect(handleBlockCategory(402)).toBe("credit_block");
    for (const type of ["credit_limit_reached", "ai_disabled", "workspace_ai_disabled"])
      expect(handleBlockCategory(403, type)).toBe("credit_block");
    expect(handleBlockCategory(403, "permission_error")).toBe("provider_access_denied");
    for (const status of [0, 400, 401, 404, 408, 429, 500, 503])
      expect(handleBlockCategory(status)).toBeNull();
    for (const type of [
      "provider_not_available_in_region",
      "model_requires_retention_consent",
      "model_vendor_not_enabled",
    ])
      expect(handleBlockCategory(403, type)).toBeNull();
  });
});
describe("password failures", () => {
  it("handles password errors without a provider message safely", () => {
    expect(signupErrorMessage({ code: "weak_password" })).toBe(
      "Please choose a stronger password with at least 8 characters.",
    );
    expect(signupErrorMessage({ code: "validation_failed" })).toBe(
      "Your account couldn't be created. You can try again or sign in.",
    );
  });
  it("gives a breached password an actionable message without revealing account existence", () => {
    expect(
      signupErrorMessage({ code: "weak_password", message: "Password found in breach list" }),
    ).toBe("This password has appeared in a data breach. Please choose a different password.");
    expect(signupErrorMessage({ code: "validation_failed", message: "Password too weak" })).toBe(
      "Please choose a stronger password with at least 8 characters.",
    );
    expect(signupErrorMessage({ code: "user_already_exists" })).toBe(
      "Your account couldn't be created. You can try again or sign in.",
    );
    expect(signupErrorMessage({})).toBe(
      "Your account couldn't be created. You can try again or sign in.",
    );
  });
});
