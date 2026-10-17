import { createFileRoute, notFound } from "@tanstack/react-router";
import { StoryStepPage } from "@/components/site/AddStory";
import { AddStoryFlow } from "@/components/site/AddStoryFlow";
import { STORY_STEPS, type StoryStep } from "@/lib/story-form";

const isStep = (s: string): s is StoryStep => Object.hasOwn(STORY_STEPS, s);

export const Route = createFileRoute("/_authenticated/story/$step")({
  validateSearch: (search: Record<string, unknown>): { plate?: string } =>
    typeof search.plate === "string" && search.plate ? { plate: search.plate } : {},
  loader: ({ params }) => {
    if (!isStep(params.step)) throw notFound();
    return { step: params.step };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Add Your Story unavailable | What the Plate?" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const label = STORY_STEPS[loaderData.step];
    const title = `Add Your Story · ${label} | What the Plate?`;
    const description = `Add a story for Oregon PNW LV: ${label.toLowerCase()}.`;
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
  component: StoryStepRoute,
});

function StoryStepRoute() {
  const { step } = Route.useLoaderData();
  const { plate } = Route.useSearch();
  if (plate) return <AddStoryFlow plateId={plate} />;
  return <StoryStepPage step={step} />;
}
