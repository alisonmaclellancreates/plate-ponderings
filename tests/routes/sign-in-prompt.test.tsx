import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/Entry", () => ({
  SignInPromptPage: ({ plateId }: { plateId?: string }) => <p>prompt {plateId ?? "none"}</p>,
}));

import { Route } from "@/routes/sign-in-prompt";

type R = {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
  validateSearch: (s: Record<string, unknown>) => { plate?: string };
  useSearch: () => { plate?: string };
};

it("renders with matching titles", () => {
  const r = Route as unknown as R;
  const C = r.component;
  r.useSearch = () => ({ plate: "abc" });
  expect(render(<C />).container.textContent).toBe("prompt abc");
  const meta = r.head().meta;
  const t = meta.find((m) => "title" in m)?.["title"];
  expect(t).toContain("Sign in to add your story");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(t);
});

it("keeps only a string plate, trimmed to 64 characters", () => {
  const r = Route as unknown as R;
  expect(r.validateSearch({ plate: 5 })).toEqual({ plate: undefined });
  expect(r.validateSearch({ plate: "x".repeat(80) }).plate).toHaveLength(64);
});
