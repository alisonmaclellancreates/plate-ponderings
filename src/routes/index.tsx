import { createFileRoute } from "@tanstack/react-router";
import { Homepage } from "@/components/site/Homepage";

const str = (v: unknown) => (typeof v === "string" && v.length <= 64 ? v : undefined);

export const Route = createFileRoute("/")({
  validateSearch: (
    s: Record<string, unknown>,
  ): {
    jurisdiction?: string | undefined;
    text?: string | undefined;
  } => ({
    jurisdiction: str(s["jurisdiction"]),
    text: str(s["text"]),
  }),
  head: () => ({
    meta: [
      { title: "What the Plate? Every plate has a story" },
      {
        name: "description",
        content:
          "Look up personalized license plates from the US and Canada and share what you think they mean.",
      },
      { property: "og:title", content: "What the Plate? Every plate has a story" },
      {
        property: "og:description",
        content:
          "Look up personalized license plates from the US and Canada and share what you think they mean.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const prefill = Route.useSearch();
  return <Homepage prefill={prefill} />;
}
