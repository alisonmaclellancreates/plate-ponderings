import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Expand } from "lucide-react";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import type { Box } from "@/lib/photo-blur";
import { plateCropStyle } from "@/lib/photo-crop";

export const PHOTO_EXPIRED_MESSAGE =
  "This photo link has expired. Reload the page to see the photo.";

/** Stored processed photos are at most this size; used until the real size loads. */
const DEFAULT_SIZE = { width: 944, height: 704 };

type StoryPhotoProps = {
  photo: string;
  box: Box;
  handle: string;
  meaning: string;
};

/**
 * The zoomed plate view on a story card and the full-photo dialog it opens.
 * Both show the same stored, blurred photo through the same link; the zoom is
 * CSS on that one image.
 */
export function StoryPhotoZoom({ photo, box, handle, meaning }: StoryPhotoProps) {
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [failed, setFailed] = useState(false);
  const crop = plateCropStyle(box, size.width, size.height);
  return (
    <Dialog onOpenChange={() => setFailed(false)}>
      <DialogPrimitive.Trigger
        aria-label={`View full photo shared by ${handle}`}
        className="relative mt-3 block h-[100px] w-[200px] overflow-hidden rounded-md bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 sm:absolute sm:right-4 sm:top-12 sm:mt-0 sm:h-20 sm:w-40"
      >
        <img
          src={photo}
          alt={`Photo shared by ${handle}`}
          width={size.width}
          height={size.height}
          loading="lazy"
          onLoad={(e) =>
            setSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })
          }
          className="absolute max-w-none"
          style={crop}
        />
        <span className="absolute bottom-1 right-1 rounded-sm bg-cream p-0.5 text-navy">
          <Expand aria-hidden className="size-3.5" />
        </span>
      </DialogPrimitive.Trigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 top-0 z-50 flex max-h-dvh flex-col gap-3 overflow-y-auto bg-background p-4 sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90dvh] sm:w-auto sm:max-w-[min(90vw,1600px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="text-lg font-bold text-navy">
                {meaning}
              </DialogPrimitive.Title>
              <p className="text-sm text-muted-foreground">Photo shared by {handle}</p>
            </div>
            <DialogPrimitive.Close className="brand-btn brand-btn-outline min-h-11 shrink-0">
              Close photo
            </DialogPrimitive.Close>
          </div>
          {failed ? (
            <p role="alert" className="rounded-md bg-slate p-4 text-sm">
              {PHOTO_EXPIRED_MESSAGE}
            </p>
          ) : (
            <img
              src={photo}
              alt={`Full photo shared by ${handle}`}
              onError={() => setFailed(true)}
              className="mx-auto h-auto max-h-[75dvh] w-auto max-w-full object-contain"
            />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** A photo saved before plate boxes were kept: the original small thumbnail. */
export function StoryPhotoThumbnail({ photo, handle }: { photo: string; handle: string }) {
  return (
    <img
      src={photo}
      alt={`Photo shared by ${handle}`}
      width={944}
      height={704}
      loading="lazy"
      className="col-start-2 h-20 w-28 shrink-0 rounded-md object-cover sm:col-start-auto"
    />
  );
}
