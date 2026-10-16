import { describe, expect, it } from "vitest";
import { renderErrorPage } from "@/lib/error-page";

describe("renderErrorPage", () => {
  it("returns a complete HTML document with the user-facing message", () => {
    const html = renderErrorPage();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
    expect(html).toContain("<title>This page didn't load</title>");
    expect(html).toContain("Something went wrong on our end.");
    expect(html).toContain('href="/"');
    expect(html).toContain("location.reload()");
  });
});
