import { createFileRoute } from "@tanstack/react-router";
import { StoryStepOne } from "@/components/site/AddStory";

const TITLE = "Demo, Add Your Story | What the Plate?";
const DESCRIPTION = "The Add a Story form in read-only demo mode.";

export const Route = createFileRoute("/demo-form")({
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
  component: () => <StoryStepOne demo />,
});
