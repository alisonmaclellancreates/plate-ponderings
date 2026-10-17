import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PhotoEditor } from "@/components/site/PhotoEditor";
import { decodePhoto } from "@/lib/photo-canvas";
import { STORY_PHOTO_BOX, STORY_PHOTO_PLACEHOLDER, type Story } from "@/lib/mock-data";
import { StoryCard } from "@/components/site/PlateDetail";
import type { Box } from "@/lib/photo-blur";

const TITLE = "Story photo sample preview | What the Plate?";
const DESCRIPTION =
  "The story photo editor with sample data: suggested box, no box found, and review.";

export const Route = createFileRoute("/previews_/story-photo")({
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
  component: StoryPhotoSample,
});

const SAMPLE_BOX: Box = STORY_PHOTO_BOX;

const SAMPLE_STORY: Story = {
  id: "sample-photo",
  handle: "Traveler4821",
  date: "2026-10-01",
  meaning: "They might be a fan of the open road",
  howIKnow: "guess",
  hearts: 2,
  photo: STORY_PHOTO_PLACEHOLDER,
  photoBox: STORY_PHOTO_BOX,
};

const OLDER_STORY: Story = {
  ...SAMPLE_STORY,
  id: "sample-older",
  meaning: "They might be counting road trips",
  photoBox: undefined,
};

type State = "box" | "no-box" | "review";

const STATES: { key: State; label: string }[] = [
  { key: "box", label: "Suggested box" },
  { key: "no-box", label: "No box found" },
  { key: "review", label: "Review" },
];

/**
 * The real photo editor over the sample photo, in each state this step adds.
 * Sample data only: no detection, no upload, and every action is inert.
 */
function StoryPhotoSample() {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [state, setState] = useState<State>("box");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    void fetch(STORY_PHOTO_PLACEHOLDER)
      .then((r) => r.blob())
      .then((blob) => decodePhoto(blob))
      .then((decoded) => {
        if (live) setBitmap(decoded);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-10">
      <h1 className="font-display text-3xl text-navy sm:text-4xl">Story photo, sample data</h1>
      <p className="text-muted-foreground">
        The photo editor Rowan reviews, over a sample photo. Nothing is detected, uploaded or
        stored.
      </p>
      <img
        src={STORY_PHOTO_PLACEHOLDER}
        alt="Sample photo with a license plate"
        className="w-full max-w-xl rounded-lg"
      />
      <div className="flex flex-wrap gap-3">
        {STATES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className="brand-btn brand-btn-outline"
            disabled={!bitmap}
            onClick={() => {
              setState(key);
              setOpen(true);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <h2 className="font-display text-2xl text-navy">Story cards</h2>
      <p className="text-muted-foreground">
        The zoomed plate opens the full photo. The second story was saved before plate boxes were
        kept, so it shows the photo as before.
      </p>
      <div className="space-y-4">
        <StoryCard story={SAMPLE_STORY} />
        <StoryCard story={OLDER_STORY} />
      </div>
      {open && bitmap && (
        <PhotoEditor
          key={state}
          imageUrl={STORY_PHOTO_PLACEHOLDER}
          bitmap={bitmap}
          initialBox={state === "box" || state === "review" ? SAMPLE_BOX : null}
          showNoBoxMessage={state === "no-box"}
          onUse={() => setOpen(false)}
          onRemove={() => setOpen(false)}
          onChooseAnother={() => {}}
        />
      )}
    </main>
  );
}
