import { createFileRoute } from "@tanstack/react-router";
import { LiveSubmissions } from "@/components/site/LiveSubmissions";

const TITLE = "Your Submissions | What the Plate?";
const DESCRIPTION = "The plates you've spotted and the stories you've shared.";

export const Route = createFileRoute("/_authenticated/submissions")({
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
  component: () => <LiveSubmissions />,
});
