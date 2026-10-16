import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";

const routerMarker = { kind: "router-marker" };
const routeTreeMarker = { kind: "route-tree-marker" };
const createRouter = vi.fn((_options: Record<string, unknown>) => routerMarker);

vi.mock("@tanstack/react-router", () => ({ createRouter }));
vi.mock("@/routeTree.gen", () => ({ routeTree: routeTreeMarker }));

import { getRouter } from "@/router";

type RouterOptions = {
  routeTree: unknown;
  context: { queryClient: unknown };
  scrollRestoration: unknown;
  defaultPreloadStaleTime: unknown;
};

const optionsOfCall = (index: number): RouterOptions =>
  createRouter.mock.calls[index]?.[0] as unknown as RouterOptions;

describe("getRouter", () => {
  afterEach(() => {
    createRouter.mockClear();
  });

  it("returns whatever createRouter builds", () => {
    expect(getRouter()).toBe(routerMarker);
    expect(createRouter).toHaveBeenCalledTimes(1);
  });

  it("passes the generated route tree and the options the source sets", () => {
    getRouter();
    const options = optionsOfCall(0);
    expect(options.routeTree).toBe(routeTreeMarker);
    expect(options.scrollRestoration).toBe(true);
    expect(options.defaultPreloadStaleTime).toBe(0);
    expect(Object.keys(options).sort()).toEqual(
      ["context", "defaultPreloadStaleTime", "routeTree", "scrollRestoration"].sort(),
    );
  });

  it("puts a QueryClient in the router context", () => {
    getRouter();
    expect(optionsOfCall(0).context.queryClient).toBeInstanceOf(QueryClient);
  });

  it("creates a fresh QueryClient on every call so requests never share a cache", () => {
    getRouter();
    getRouter();
    const first = optionsOfCall(0).context.queryClient;
    const second = optionsOfCall(1).context.queryClient;
    expect(first).toBeInstanceOf(QueryClient);
    expect(second).toBeInstanceOf(QueryClient);
    expect(first).not.toBe(second);
  });
});
