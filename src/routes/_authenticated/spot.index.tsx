import { createFileRoute } from "@tanstack/react-router";
import { SpotLivePage } from "@/components/site/SpotPlate";

const TITLE = "Spot a Plate | What the Plate?";
const DESCRIPTION = "Seen a curious plate? Add it to the collection and let the guessing begin.";

const str = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);

export const Route = createFileRoute("/_authenticated/spot/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { jurisdiction?: string | undefined; text?: string | undefined } => ({
    jurisdiction: str(s["jurisdiction"]),
    text: str(s["text"]),
  }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotRoute,
});

function SpotRoute() {
  const prefill = Route.useSearch();
  return <SpotLivePage values={prefill} />;
}
