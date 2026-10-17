import { useEffect, useRef, useState } from "react";
import {
  boxFromDrag,
  clampBox,
  moveBox,
  resizeBox,
  type Box,
  type Corner,
  type Point,
} from "@/lib/photo-blur";
import { canvasToJpegBlob, renderBlurredPhoto } from "@/lib/photo-canvas";
import { Button } from "@/components/ui/button";

const outline = "brand-btn brand-btn-outline min-h-11 h-auto whitespace-normal";
const coral = "brand-btn brand-btn-coral min-h-11 h-auto whitespace-normal";

export const NO_BOX_MESSAGE =
  "We couldn't find the plate in this photo. Draw a box around it to keep it clear.";
export const ADJUST_NOTE = "Move and resize the box so only the license plate is clear.";
export const REVIEW_NOTE =
  "Before you share, check that faces, addresses, and other plates are blurred.";

export type PhotoEditorProps = {
  /** Object URL of the decoded original, shown while adjusting. */
  imageUrl: string;
  /** The decoded image with EXIF rotation applied; source of the blur. */
  bitmap: ImageBitmap;
  /** The suggested box, or null when none was found. */
  initialBox: Box | null;
  /** Show the "no box found" message (also used when detection was skipped). */
  showNoBoxMessage: boolean;
  /** Confirmed processed photo; `adjusted` is true when the box was changed. */
  onUse: (blob: Blob, adjusted: boolean) => void;
  onRemove: () => void;
  /** Open the replacement file picker without changing the current editor. */
  onChooseAnother: () => void;
};

type Drag =
  | { kind: "move"; start: Point; box: Box }
  | { kind: "resize"; corner: Corner; start: Point; box: Box }
  | { kind: "draw"; start: Point };

const sameBox = (a: Box | null, b: Box | null) =>
  a === b ||
  (a !== null &&
    b !== null &&
    Math.abs(a.x - b.x) < 0.001 &&
    Math.abs(a.y - b.y) < 0.001 &&
    Math.abs(a.w - b.w) < 0.001 &&
    Math.abs(a.h - b.h) < 0.001);

/**
 * The adjustable plate box and the blur review. The review shows the actual
 * processed canvas image, never a blur effect over the original; changing the
 * box afterwards rebuilds the preview and must be confirmed again.
 */
export function PhotoEditor({
  imageUrl,
  bitmap,
  initialBox,
  showNoBoxMessage,
  onUse,
  onRemove,
  onChooseAnother,
}: PhotoEditorProps) {
  const [box, setBox] = useState<Box | null>(initialBox);
  const [mode, setMode] = useState<"adjust" | "review">("adjust");
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  useEffect(() => {
    setBox(initialBox);
    setMode("adjust");
    setProcessedUrl(null);
  }, [initialBox, imageUrl]);

  useEffect(
    () => () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl);
    },
    [processedUrl],
  );

  const pointAt = (e: React.PointerEvent): Point => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  };

  const beginDrag = (e: React.PointerEvent, next: Drag) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = next;
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const p = pointAt(e);
    if (box && p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h) {
      beginDrag(e, { kind: "move", start: p, box });
    } else {
      beginDrag(e, { kind: "draw", start: p });
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const active = drag.current;
    if (!active) return;
    const p = pointAt(e);
    if (active.kind === "move") {
      setBox(moveBox(active.box, p.x - active.start.x, p.y - active.start.y));
    } else if (active.kind === "resize") {
      setBox(resizeBox(active.box, active.corner, p.x - active.start.x, p.y - active.start.y));
    } else {
      setBox(boxFromDrag(active.start, p));
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const nudge = (e: React.KeyboardEvent) => {
    if (!box) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const delta = moves[e.key];
    if (!delta) return;
    e.preventDefault();
    setBox(moveBox(box, delta[0], delta[1]));
  };

  const confirm = async () => {
    if (!box) return;
    setProcessing(true);
    try {
      const canvas = renderBlurredPhoto(bitmap, box);
      const blob = await canvasToJpegBlob(canvas);
      setProcessedUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
      setMode("review");
    } finally {
      setProcessing(false);
    }
  };

  const use = async () => {
    if (!box || !processedUrl) return;
    setProcessing(true);
    try {
      const canvas = renderBlurredPhoto(bitmap, box);
      const blob = await canvasToJpegBlob(canvas);
      onUse(blob, !sameBox(box, initialBox));
    } finally {
      setProcessing(false);
    }
  };

  const handle = "absolute size-11 touch-none flex items-center justify-center after:size-4 after:rounded-sm after:border-2 after:border-navy after:bg-cream";
  const corners: { corner: Corner; className: string }[] = [
    { corner: "nw", className: "-left-5.5 -top-5.5 cursor-nwse-resize" },
    { corner: "ne", className: "-right-5.5 -top-5.5 cursor-nesw-resize" },
    { corner: "sw", className: "-bottom-5.5 -left-5.5 cursor-nesw-resize" },
    { corner: "se", className: "-bottom-5.5 -right-5.5 cursor-nwse-resize" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-navy/60 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-editor-title"
        className="h-full w-full overflow-y-auto bg-cream p-5 sm:h-auto sm:max-h-full sm:max-w-4xl sm:rounded-xl sm:p-8"
      >
        <h2 id="photo-editor-title" className="font-display text-3xl text-navy">
          {mode === "adjust" ? "Adjust the plate area" : "Review your photo"}
        </h2>
        <div className="mt-4">
          {mode === "adjust" ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <Button type="button" variant="outline" className={outline} onClick={onChooseAnother}>
                  Choose another photo
                </Button>
                <Button type="button" variant="outline" className={outline} onClick={onRemove}>
                  Skip photo
                </Button>
              </div>
              <div
                ref={frame}
                data-testid="photo-frame"
                className="relative mx-auto touch-none overflow-hidden rounded-lg select-none"
                style={{ width: `min(100%, ${(bitmap.width / bitmap.height) * 45}dvh)` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                <img
                  src={imageUrl}
                  alt="Your photo; everything except the plate will be blurred"
                  className="w-full"
                  draggable={false}
                />
                {box && (
                  <div
                    data-testid="plate-box"
                    role="slider"
                    aria-label="Plate area"
                    aria-valuetext={`${Math.round(box.w * 100)} percent wide`}
                    tabIndex={0}
                    onKeyDown={nudge}
                    className="absolute cursor-move border-2 border-cream shadow-[0_0_0_2px_var(--navy)] focus:outline-2 focus:outline-teal"
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.w * 100}%`,
                      height: `${box.h * 100}%`,
                    }}
                  >
                    {corners.map(({ corner, className }) => (
                      <span
                        key={corner}
                        data-testid={`handle-${corner}`}
                        className={`${handle} ${className}`}
                        onPointerDown={(e) =>
                          beginDrag(e, { kind: "resize", corner, start: pointAt(e), box })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-3">
                {showNoBoxMessage && !box ? NO_BOX_MESSAGE : ADJUST_NOTE}
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className={outline}
                  onClick={() => setBox(initialBox)}
                  disabled={!initialBox}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  className={`${coral} sm:ml-auto`}
                  disabled={!box || processing}
                  onClick={() => void confirm()}
                >
                  Next
                </Button>
              </div>
            </>
          ) : (
            <div className="grid gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-start">
              <img
                src={processedUrl ?? ""}
                alt="Your processed photo, blurred except the plate"
                data-testid="processed-photo"
                className="w-full rounded-lg"
              />
              <div className="brand-card bg-cream-warm p-5">
                <h3 className="font-display text-2xl text-navy">Does this look right?</h3>
                <p className="mt-2">{REVIEW_NOTE}</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button
                    type="button"
                    className={coral}
                    disabled={processing}
                    onClick={() => void use()}
                  >
                    Use This Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={outline}
                    onClick={() => {
                      setProcessedUrl((old) => {
                        if (old) URL.revokeObjectURL(old);
                        return null;
                      });
                      setMode("adjust");
                    }}
                  >
                    Adjust
                  </Button>
                  <Button type="button" variant="outline" className={outline} onClick={onRemove}>
                    Remove Photo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
