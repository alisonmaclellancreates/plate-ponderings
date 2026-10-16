import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  PlateDetail,
  PLATE_DETAIL_STATES,
  type PlateDetailState,
} from "@/components/site/PlateDetail";
import { PLATES } from "@/lib/mock-data";

const isState = (s: string): s is PlateDetailState => Object.hasOwn(PLATE_DETAIL_STATES, s);

export const Route = createFileRoute("/plate/$state")({
  loader: ({ params }) => {
    if (!isState(params.state) && !PLATES.some((p) => p.slug === params.state)) throw notFound();
    return { state: params.state };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Plate unavailable | What the Plate?" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const info = isState(loaderData.state) ? PLATE_DETAIL_STATES[loaderData.state] : undefined;
    const plate = PLATES.find((p) => p.slug === (info?.slug ?? loaderData.state));
    if (!plate) return { meta: [{ title: "Plate unavailable | What the Plate?" }, { name: "robots", content: "noindex" }] };
    const title = `${plate.text} (${plate.jurisdiction}) · ${info?.label ?? "Plate stories"} | What the Plate?`;
    const description = `Stories about the ${plate.jurisdiction} plate ${plate.text}, and what people think it means.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PlateDetailRoute,
});

function PlateDetailRoute() {
  const { state } = Route.useLoaderData();
  return <PlateDetail state={state} />;
}
