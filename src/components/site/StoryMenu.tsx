import { Flag, Trash2, UserX } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";

import { REPORT_REASON_OPTIONS, type ReportReasonKey } from "@/lib/report-reasons";
export { REPORT_REASON_OPTIONS, REPORT_REASONS, type ReportReasonKey } from "@/lib/report-reasons";

type MenuHandlers = {
  onReport?: (() => void) | undefined;
  onBlock?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
};

/** The story card menu: other people's stories get Report and Block; your own gets Delete. */
export function StoryMenuList({
  handle,
  menu,
  className = "brand-card absolute right-4 top-12 z-10 w-56 p-2 shadow-md",
  onReport,
  onBlock,
  onDelete,
}: { handle: string; menu: "other" | "own"; className?: string } & MenuHandlers) {
  return (
    <ul
      role="menu"
      aria-label={menu === "own" ? "Your story options" : `Options for ${handle}'s story`}
      data-testid={menu === "own" ? "own-menu" : "other-menu"}
      className={className}
    >
      {menu === "own" ? (
        <li>
          <button
            type="button"
            role="menuitem"
            onClick={onDelete}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
          >
            <Trash2 aria-hidden className="size-4" />
            Delete my story
          </button>
        </li>
      ) : (
        <>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={onReport}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
            >
              <Flag aria-hidden className="size-4" />
              Report story
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={onBlock}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-muted"
            >
              <UserX aria-hidden className="size-4" />
              Block {handle}
            </button>
          </li>
        </>
      )}
    </ul>
  );
}

/** Modal report dialog on the shared dialog primitives; wording and layout unchanged. */
export function ReportDialog({
  open,
  onOpenChange,
  onSend,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (reason: ReportReasonKey, note: string) => void;
  busy?: boolean;
}) {
  const [note, setNote] = useState("");
  const [reason, setReason] = useState<ReportReasonKey | null>(null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent
          data-testid="report-dialog"
          aria-describedby={undefined}
          className="brand-card max-w-lg p-6"
        >
          <DialogTitle className="font-display text-2xl text-navy">
            Why are you reporting this story?
          </DialogTitle>
          <fieldset className="mt-4 space-y-2">
            <legend className="sr-only">Report reason</legend>
            {REPORT_REASON_OPTIONS.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={option.key}
                  checked={reason === option.key}
                  onChange={() => setReason(option.key)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
          <label htmlFor="report-note" className="mt-4 block font-semibold text-navy">
            Optional note
          </label>
          <textarea
            id="report-note"
            name="report-note"
            rows={3}
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby="report-note-count"
            className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2"
          />
          <p id="report-note-count" className="mt-1 text-right text-sm text-muted-foreground">
            {note.length}/200
          </p>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <button type="button" className="brand-btn brand-btn-outline">
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={busy || reason === null}
              onClick={() => reason && onSend?.(reason, note)}
              className="brand-btn brand-btn-navy"
            >
              Send Report
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}

/** Modal delete confirmation on the shared dialog primitives; wording and layout unchanged. */
export function DeleteStoryDialog({
  open,
  onOpenChange,
  onDelete,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent data-testid="delete-story-dialog" className="brand-card max-w-lg p-6">
          <DialogTitle className="font-display text-2xl text-navy">Delete your story?</DialogTitle>
          <DialogDescription className="mt-3 text-foreground">
            Your story will no longer appear on this plate. This also removes its hearts and may
            change The Story So Far.
          </DialogDescription>
          <div className="mt-4 flex flex-wrap justify-end gap-3">
            <DialogClose asChild>
              <button type="button" className="brand-btn brand-btn-navy">
                Keep Story
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="brand-btn brand-btn-coral"
            >
              Delete Story
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
