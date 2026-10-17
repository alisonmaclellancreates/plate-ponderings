import { createFileRoute } from "@tanstack/react-router";
import { AddStoryFlow, type AddStoryPreview } from "@/components/site/AddStoryFlow";
import {
  SAMPLE_STORY,
  STORY_SUBMIT_ERROR_HEADING,
  STORY_SUBMIT_ERROR_MESSAGE,
} from "@/lib/story-form";

/** Inert preview of the real story form after a failed submit. Nothing is read or written. */
const PREVIEW: AddStoryPreview = {
  plate: { id: "preview-story-states", jurisdiction: "Oregon", text: "PNW LV" },
  draft: { how: SAMPLE_STORY.how, meaning: SAMPLE_STORY.meaning, more: SAMPLE_STORY.more },
  notice: { heading: STORY_SUBMIT_ERROR_HEADING, message: STORY_SUBMIT_ERROR_MESSAGE },
};

export const Route = createFileRoute("/previews_/story-error")({
  head: () => ({
    meta: [
      { title: "Story form, error preview | What the Plate?" },
      {
        name: "description",
        content: "Inert preview of the story form after a failed submit, with the draft kept.",
      },
      { property: "og:title", content: "Story form, error preview | What the Plate?" },
      {
        property: "og:description",
        content: "Inert preview of the story form after a failed submit, with the draft kept.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StoryErrorPreview,
});

function StoryErrorPreview() {
  return <AddStoryFlow plateId={PREVIEW.plate.id} preview={PREVIEW} />;
}
