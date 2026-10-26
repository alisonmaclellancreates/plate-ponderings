import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

let loaderData = { entry: { slug: "spot-new" } };
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => ({
    ...o,
    useLoaderData: () => loaderData,
  }),
  notFound: () => new Error("not found"),
}));
vi.mock("@/components/previews/PreviewIndex", () => ({ PreviewIndex: () => <p>index</p> }));
vi.mock("@/components/previews/PreviewScreens", () => ({
  PreviewScreen: ({ slug }: { slug: string }) => <p>screen {slug}</p>,
}));

import { Route as IndexRoute } from "@/routes/previews";
import { Route as ScreenRoute } from "@/routes/previews_.$screen";

type Meta = Record<string, string>[];
const I = IndexRoute as unknown as { head: () => { meta: Meta }; component: () => ReactNode };
const S = ScreenRoute as unknown as {
  loader: (a: { params: { screen: string } }) => { entry: { slug: string } };
  head: (a: { loaderData?: { entry: { slug: string } } }) => { meta: Meta };
  component: () => ReactNode;
};

it("serves the gallery index without letting search engines index it", () => {
  const C = I.component;
  expect(render(<C />).container.textContent).toBe("index");
  const meta = I.head().meta;
  expect(meta.find((m) => m["name"] === "robots")?.["content"]).toBe("noindex, nofollow");
  expect(meta.find((m) => "title" in m)?.["title"]).toBe("Previews | What the Plate?");
});

it("loads a listed screen and refuses an unlisted one", () => {
  expect(S.loader({ params: { screen: "spot-new" } }).entry.slug).toBe("spot-new");
  expect(() => S.loader({ params: { screen: "nope" } })).toThrow("not found");
});

it("renders the loaded screen with its own noindex head", () => {
  const C = S.component;
  expect(render(<C />).container.textContent).toBe("screen spot-new");
  const head = S.head({ loaderData: S.loader({ params: { screen: "spot-new" } }) }).meta;
  expect(head.find((m) => "title" in m)?.["title"]).toBe("New mystery (sample) | What the Plate?");
  expect(S.head({}).meta.find((m) => m["name"] === "robots")?.["content"]).toBe(
    "noindex, nofollow",
  );
  loaderData = { entry: { slug: "admin" } };
  expect(render(<C />).container.textContent).toBe("screen admin");
});
