import { expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SUBMISSIONS_KEY } from "@/lib/submissions-queries";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@/lib/submissions.functions", () => ({
  getSubmissions: vi.fn(),
  markSubmissionsRead: vi.fn(() => Promise.resolve()),
  dismissSubmission: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/site/Account", () => ({ SubmissionsPage: () => <p>page</p> }));

import { Route } from "@/routes/_authenticated/submissions";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
};

it("renders the page with matching titles", async () => {
  const C = R.component;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(SUBMISSIONS_KEY, { rows: [], unreadCount: 0 });
  render(
    <QueryClientProvider client={client}>
      <C />
    </QueryClientProvider>,
  );
  expect(await screen.findByText("page")).toBeTruthy();
  const meta = R.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toContain("Your Submissions");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});
