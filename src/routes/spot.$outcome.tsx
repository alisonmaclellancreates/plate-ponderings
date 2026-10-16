import { createFileRoute, notFound } from "@tanstack/react-router";
import { SPOT_OUTCOMES, SpotOutcomePage, type SpotOutcome } from "@/components/site/SpotPlate";

const isOutcome = (s: string): s is SpotOutcome => Object.hasOwn(SPOT_OUTCOMES, s);

export const Route = createFileRoute("/spot/$outcome")({
  loader: ({ params }) => {
    if (!isOutcome(params.outcome)) throw notFound();
    return { outcome: params.outcome };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Spot a Plate unavailable | What the Plate?" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Spot a Plate · ${SPOT_OUTCOMES[loaderData.outcome]} | What the Plate?`;
    const description = `Spot a Plate preview: ${SPOT_OUTCOMES[loaderData.outcome].toLowerCase()}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: SpotOutcomeRoute,
});

function SpotOutcomeRoute() {
  const { outcome } = Route.useLoaderData();
  return <SpotOutcomePage outcome={outcome} />;
}
