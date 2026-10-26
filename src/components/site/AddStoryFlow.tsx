import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PhotoEditor } from "@/components/site/PhotoEditor";
import { AddStoryView, type FlowStep } from "@/components/site/AddStoryView";
import { getPlate } from "@/lib/plates.functions";
import { addStory, getPlateStories, type HowKey } from "@/lib/stories.functions";
import { detectPlateBox, uploadStoryPhoto } from "@/lib/photos.functions";
import { blobToDataUrl, decodePhoto, toDetectDataUrl } from "@/lib/photo-canvas";
import type { Box } from "@/lib/photo-blur";
import {
  MEANING_START,
  frameMeaning,
  STORY_RATE_LIMIT_HEADING,
  STORY_SUBMIT_ERROR_HEADING,
  STORY_SUBMIT_ERROR_MESSAGE,
} from "@/lib/story-form";
import { useAccountAuth } from "@/lib/account-auth";
import { track } from "@/lib/analytics";

/** A chosen photo being worked on: the decoded image and its display URL. */
type PhotoDraft = {
  bitmap: ImageBitmap;
  imageUrl: string;
  suggestion: Box | null;
  noBoxMessage: boolean;
};

/** The confirmed photo: uploaded path plus the processed preview for review. */
type PhotoReady = { path: string; previewUrl: string; box: Box };

/** The real three-step story flow for a published plate. */
export function AddStoryFlow({ plateId }: { plateId: string }) {
  const [step, setStep] = useState<FlowStep>("1");
  const [how, setHow] = useState<HowKey>("owner");
  const [meaning, setMeaning] = useState(MEANING_START);
  const [more, setMore] = useState("");
  const [rejected, setRejected] = useState(false);
  const [pause, setPause] = useState<{ heading: string | null; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoDraft, setPhotoDraft] = useState<PhotoDraft | null>(null);
  const [photoReady, setPhotoReady] = useState<PhotoReady | null>(null);
  const [photoUnreadable, setPhotoUnreadable] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const started = useRef(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const photoSelection = useRef(0);
  const photoPreviewUrl = photoReady?.previewUrl;

  useEffect(() => {
    if (!photoPreviewUrl) return;
    return () => URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  useEffect(
    () => () => {
      photoSelection.current += 1;
    },
    [],
  );

  useEffect(
    () => () => {
      if (photoDraft) {
        photoDraft.bitmap.close();
        URL.revokeObjectURL(photoDraft.imageUrl);
      }
    },
    [photoDraft],
  );

  const { data: plateData } = useQuery({
    queryKey: ["plate", plateId],
    queryFn: () => getPlate({ data: { id: plateId } }),
  });
  const { data: storiesData } = useQuery({
    queryKey: ["plate-stories", plateId],
    queryFn: () => getPlateStories({ data: { plateId } }),
  });
  const auth = useAccountAuth();
  const demo = Boolean(auth?.account?.isDemo);
  const submitStory = useServerFn(addStory);
  const detectBox = useServerFn(detectPlateBox);
  const uploadPhoto = useServerFn(uploadStoryPhoto);

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      void track("story_started", {});
    }
  }, []);

  const plate = plateData?.plate;

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    const selection = ++photoSelection.current;
    setPhotoUnreadable(false);
    let bitmap: ImageBitmap;
    try {
      bitmap = await decodePhoto(file);
    } catch {
      setPhotoUnreadable(true);
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    let draft: PhotoDraft;
    // Detection is a shortcut, never a gate: any failure means draw the box.
    try {
      const result = await detectBox({ data: { image: toDetectDataUrl(bitmap) } });
      if (result.outcome === "demo") void track("demo_write_refused", { action: "detect_photo" });
      draft = {
        bitmap,
        imageUrl,
        suggestion: result.outcome === "ok" ? result.box : null,
        noBoxMessage: result.outcome !== "ok" || result.box === null,
      };
    } catch {
      draft = { bitmap, imageUrl, suggestion: null, noBoxMessage: true };
    }
    if (selection !== photoSelection.current) {
      bitmap.close();
      URL.revokeObjectURL(imageUrl);
      return;
    }
    setPhotoDraft(draft);
  };

  const chooseAnotherPhoto = () => {
    // The editor's replacement callback exists only with this input mounted.
    const input = photoInput.current as HTMLInputElement;
    input.value = "";
    input.click();
  };

  const skipEditorPhoto = () => {
    photoSelection.current += 1;
    setPhotoDraft(null);
    setPhotoUnreadable(false);
    (photoInput.current as HTMLInputElement).value = "";
    void track("photo_skipped", {});
    setStep("2");
  };

  const handleUsePhoto = async (blob: Blob, adjusted: boolean, box: Box, draft: PhotoDraft) => {
    setPhotoBusy(true);
    try {
      const uploaded = await uploadPhoto({ data: { jpeg: await blobToDataUrl(blob) } });
      if (uploaded.outcome !== "ok") {
        if (uploaded.outcome === "demo")
          void track("demo_write_refused", { action: "upload_photo" });
        setPause({ heading: STORY_SUBMIT_ERROR_HEADING, message: STORY_SUBMIT_ERROR_MESSAGE });
        setPhotoDraft(null);
        return;
      }
      void track("photo_added", {
        box_found: draft.suggestion !== null,
        box_adjusted: adjusted,
      });
      setPhotoReady({ path: uploaded.path, previewUrl: URL.createObjectURL(blob), box });
      setPhotoDraft(null);
    } catch {
      setPause({ heading: STORY_SUBMIT_ERROR_HEADING, message: STORY_SUBMIT_ERROR_MESSAGE });
      setPhotoDraft(null);
    } finally {
      setPhotoBusy(false);
    }
  };

  const skipPhoto = () => {
    void track("photo_skipped", {});
    setStep("3");
  };

  if (!plate) return null;
  const ownerExists = storiesData?.hasOwnerStory ?? false;

  const onSubmit = async () => {
    setSubmitting(true);
    setRejected(false);
    setPause(null);
    try {
      const result = await submitStory({
        data: {
          plateId,
          meaning: frameMeaning(meaning),
          source: how,
          more,
          photoPath: photoReady?.path ?? "",
          photoBox: photoReady?.box ?? null,
        },
      });
      const outcome =
        result.outcome === "rate-limited"
          ? "rate_limited"
          : result.outcome === "demo" || result.outcome === "validation"
            ? "error"
            : result.outcome;
      void track("story_submitted", {
        source: how,
        has_more_text: more.trim().length > 0,
        outcome,
      });
      // The server deletes the uploaded photo on every outcome that saves no
      // story, so the form must forget it too; a retry re-adds the photo.
      if (result.outcome !== "published" && result.outcome !== "pending") setPhotoReady(null);
      if (result.outcome === "published") setStep("done");
      else if (result.outcome === "pending") setStep("checking");
      else if (result.outcome === "rejected") {
        setRejected(true);
        setStep("1");
      } else if (result.outcome === "rate-limited") {
        setPause({ heading: STORY_RATE_LIMIT_HEADING, message: result.message });
        setStep("1");
      } else if (result.outcome === "demo") {
        void track("demo_write_refused", { action: "submit_story" });
        setPause({ heading: null, message: result.message });
        setStep("1");
      } else {
        setPause({
          heading: STORY_SUBMIT_ERROR_HEADING,
          message: STORY_SUBMIT_ERROR_MESSAGE,
        });
        setStep("1");
      }
    } catch {
      void track("story_submitted", {
        source: how,
        has_more_text: more.trim().length > 0,
        outcome: "error",
      });
      setPause({
        heading: STORY_SUBMIT_ERROR_HEADING,
        message: STORY_SUBMIT_ERROR_MESSAGE,
      });
      setStep("1");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AddStoryView
      step={step}
      plateId={plateId}
      plate={plate}
      how={how}
      meaning={meaning}
      more={more}
      ownerExists={ownerExists}
      demo={demo}
      rejected={rejected}
      pause={pause}
      submitting={submitting}
      photoUrl={photoReady?.previewUrl ?? null}
      photoUnreadable={photoUnreadable}
      photoBusy={photoBusy}
      photoInputRef={photoInput}
      editor={
        photoDraft && (
          <PhotoEditor
            imageUrl={photoDraft.imageUrl}
            bitmap={photoDraft.bitmap}
            initialBox={photoDraft.suggestion}
            showNoBoxMessage={photoDraft.noBoxMessage}
            onUse={(blob, adjusted, box) => void handleUsePhoto(blob, adjusted, box, photoDraft)}
            onRemove={skipEditorPhoto}
            onChooseAnother={chooseAnotherPhoto}
          />
        )
      }
      onHow={setHow}
      onMeaning={setMeaning}
      onMore={setMore}
      onNext={() => {
        setMeaning(frameMeaning(meaning));
        setStep("2");
      }}
      onStep={setStep}
      onChoosePhoto={(file) => void choosePhoto(file)}
      onRemovePhoto={() => {
        setPhotoReady(null);
        void track("photo_skipped", {});
      }}
      onSkipPhoto={skipPhoto}
      onSubmit={() => void onSubmit()}
    />
  );
}
