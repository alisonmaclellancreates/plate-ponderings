import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const m = vi.hoisted(() => ({ fns: [] as ReturnType<typeof vi.fn>[] }));
const spy = () => {
  const fn = vi.fn();
  m.fns.push(fn);
  return fn;
};
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (id: string) => (options: Record<string, unknown>) => ({ ...options, id }),
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));
vi.mock("@/components/site/AiCheckStatus", () => ({ AiCheckStatus: () => null }));
vi.mock("@/lib/admin.functions", () => ({
  getReportedStories: spy(),
  setStoryHidden: spy(),
  recheckAllPending: spy(),
  getAdminAccess: spy(),
}));
vi.mock("@/lib/story-actions.functions", () => ({ getBlockedPeople: spy(), unblockUser: spy() }));
vi.mock("@/lib/account-delete.functions", () => ({ deleteAccount: spy() }));

import { Route as AdminRoute } from "@/routes/previews_.admin";
import { Route as SettingsRoute } from "@/routes/previews_.settings";
import { Route as DeleteRoute } from "@/routes/previews_.settings-delete-confirm";

type R = {
  id: string;
  loader?: unknown;
  component: () => ReactNode;
  head: () => { meta: Record<string, string>[] };
};
const asRoute = (r: unknown) => r as R;
const ogTitle = (r: R) => r.head().meta.find((x) => x["property"] === "og:title")?.["content"];

describe("Step 48 sample previews", () => {
  it("admin: unnested, loader-free, visible and hidden reports, inert actions", async () => {
    const route = asRoute(AdminRoute);
    expect(route.id).toBe("/previews_/admin");
    expect(route.loader).toBeUndefined();
    expect(ogTitle(route)).toBe("Admin sample preview | What the Plate?");
    const Page = route.component;
    render(<Page />);
    expect(screen.getAllByRole("button", { name: "Hide" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Unhide" }).length).toBeGreaterThan(0);
    expect(screen.getByText("2 items waiting for a safety check.")).toBeTruthy();
    for (const name of ["Hide", "Unhide"])
      await userEvent.click(screen.getAllByRole("button", { name })[0]!);
    await userEvent.click(screen.getByRole("button", { name: "Recheck pending" }));
    expect(screen.queryByRole("alert")).toBeNull();
    for (const fn of m.fns) expect(fn).not.toHaveBeenCalled();
  });
  it("settings: sample blocked people with an inert Unblock", async () => {
    const route = asRoute(SettingsRoute);
    expect(route.id).toBe("/previews_/settings");
    expect(route.loader).toBeUndefined();
    expect(ogTitle(route)).toBe("Settings sample preview | What the Plate?");
    const Page = route.component;
    render(<Page />);
    expect(screen.getByText("maplegirl")).toBeTruthy();
    expect(screen.getByText("rivercat")).toBeTruthy();
    await userEvent.click(screen.getAllByRole("button", { name: "Unblock" })[0]!);
    expect(screen.getByText("maplegirl")).toBeTruthy();
    for (const fn of m.fns) expect(fn).not.toHaveBeenCalled();
  });
  it("delete confirm: Keep My Account and an inert Delete Account", async () => {
    const route = asRoute(DeleteRoute);
    expect(route.id).toBe("/previews_/settings-delete-confirm");
    expect(route.loader).toBeUndefined();
    expect(ogTitle(route)).toBe("Delete account sample preview | What the Plate?");
    const Page = route.component;
    render(<Page />);
    expect(screen.getByRole("link", { name: "Keep My Account" })).toHaveAttribute(
      "href",
      "/settings",
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete Account" }));
    expect(screen.queryByRole("alert")).toBeNull();
    for (const fn of m.fns) expect(fn).not.toHaveBeenCalled();
  });
});
