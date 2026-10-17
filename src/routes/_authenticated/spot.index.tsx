import { createFileRoute } from "@tanstack/react-router";
import { SpotPage } from "@/components/site/SpotPlate";

const TITLE = "Spot a Plate | What the Plate?";
const DESCRIPTION = "Seen a curious plate? Add it to the collection and let the guessing begin.";

export const Route = createFileRoute("/_authenticated/spot/")({
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
  component: () => <SpotPage />,
});
