import { createFileRoute } from "@tanstack/react-router";
import { StoryMenuPage } from "@/components/site/StoryMenu";

const TITLE = "Story menus | What the Plate?";
const DESCRIPTION = "Preview of story menus, reporting and deleting a story.";

export const Route = createFileRoute("/story-menu")({
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
  component: () => <StoryMenuPage />,
});
