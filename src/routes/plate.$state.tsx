import { createFileRoute, notFound } from "@tanstack/react-router";
import { PlateDetail, RealPlateDetail } from "@/components/site/PlateDetail";
import { PLATE_DETAIL_STATES, type PlateDetailState } from "@/lib/plate-detail";
import { PLATES } from "@/lib/mock-data";
import { getPlate } from "@/lib/plates.functions";

const isState = (s: string): s is PlateDetailState => Object.hasOwn(PLATE_DETAIL_STATES, s);

const str = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);

export const Route = createFileRoute("/plate/$state")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    jurisdiction?: string | undefined;
    text?: string | undefined;
    from?: "submissions" | undefined;
  } => ({
    jurisdiction: str(s["jurisdiction"]),
    text: str(s["text"]),
    from: s["from"] === "submissions" ? "submissions" : undefined,
  }),
  loader: async ({ params }) => {
    if (isState(params.state) || PLATES.some((p) => p.slug === params.state))
      return { state: params.state, plate: null };
    const { plate } = await getPlate({ data: { id: params.state } });
    if (!plate) throw notFound();
    return { state: params.state, plate };
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
    if (loaderData.plate) {
      const title = `${loaderData.plate.text} (${loaderData.plate.jurisdiction}) | What the Plate?`;
      const description = `Stories about the ${loaderData.plate.jurisdiction} plate ${loaderData.plate.text}, and what people think it means.`;
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
    }
    const info = isState(loaderData.state) ? PLATE_DETAIL_STATES[loaderData.state] : undefined;
    const plate = PLATES.find((p) => p.slug === (info?.slug ?? loaderData.state));
    if (!plate)
      return {
        meta: [
          { title: "Plate unavailable | What the Plate?" },
          { name: "robots", content: "noindex" },
        ],
      };
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
  const { state, plate } = Route.useLoaderData();
  const search = Route.useSearch();
  if (plate) {
    const backToSearch =
      search.jurisdiction && search.text
        ? { jurisdiction: search.jurisdiction, text: search.text }
        : undefined;
    return <RealPlateDetail plate={plate} backToSearch={backToSearch} from={search.from} />;
  }
  return <PlateDetail state={state} />;
}
