import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({
  access: (() => Promise.resolve({ admin: false })) as () => Promise<{ admin: boolean }>,
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
  redirect: (options: unknown) => ({ redirect: options }),
}));
vi.mock("@/components/site/LiveAdmin", () => ({ LiveAdmin: () => <p>page</p> }));
vi.mock("@/lib/admin.functions", () => ({ getAdminAccess: () => m.access() }));

import { Route } from "@/routes/_authenticated/admin";

const R = Route as unknown as {
  head: () => { meta: Record<string, string>[] };
  component: () => ReactNode;
  beforeLoad: () => Promise<void>;
};

it("renders the page with matching titles", () => {
  const C = R.component;
  expect(render(<C />).container.textContent).toBe("page");
  const meta = R.head().meta;
  const title = meta.find((m) => "title" in m)?.["title"];
  expect(title).toContain("Admin");
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(title);
});

it("lets admins through", async () => {
  m.access = () => Promise.resolve({ admin: true });
  await expect(R.beforeLoad()).resolves.toBeUndefined();
});

it("sends non-admins home from beforeLoad", async () => {
  m.access = () => Promise.resolve({ admin: false });
  await expect(R.beforeLoad()).rejects.toEqual({ redirect: { to: "/", replace: true } });
});

it("treats a failed access check as not admin", async () => {
  m.access = () => Promise.reject(new Error("down"));
  await expect(R.beforeLoad()).rejects.toEqual({ redirect: { to: "/", replace: true } });
});
