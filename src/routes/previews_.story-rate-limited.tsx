import { createFileRoute } from "@tanstack/react-router";
import { AddStoryFlow, type AddStoryPreview } from "@/components/site/AddStoryFlow";
import { SAMPLE_STORY, STORY_RATE_LIMIT_HEADING } from "@/lib/story-form";
import { RATE_LIMIT_MESSAGE } from "@/lib/account-rules";

/** Inert preview of the real story form after a rate limit. Nothing is read or written. */
const PREVIEW: AddStoryPreview = {
  plate: { id: "preview-story-states", jurisdiction: "Oregon", text: "PNW LV" },
  draft: { how: SAMPLE_STORY.how, meaning: SAMPLE_STORY.meaning, more: SAMPLE_STORY.more },
  notice: { heading: STORY_RATE_LIMIT_HEADING, message: RATE_LIMIT_MESSAGE },
};

export const Route = createFileRoute("/previews_/story-rate-limited")({
  head: () => ({
    meta: [
      { title: "Story form, paused preview | What the Plate?" },
      {
        name: "description",
        content: "Inert preview of the story form after a rate limit, with the draft kept.",
      },
      { property: "og:title", content: "Story form, paused preview | What the Plate?" },
      {
        property: "og:description",
        content: "Inert preview of the story form after a rate limit, with the draft kept.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoryRateLimitedPreview,
});

function StoryRateLimitedPreview() {
  return <AddStoryFlow plateId={PREVIEW.plate.id} preview={PREVIEW} />;
}
