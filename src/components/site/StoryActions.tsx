import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Heart, MoreHorizontal } from "lucide-react";
import { DeleteStoryDialog, ReportDialog, StoryMenuList } from "@/components/site/StoryMenu";
import { useAccountAuth } from "@/lib/account-auth";
import { useMenuDismiss } from "@/lib/menu-dismiss";
import { track } from "@/lib/analytics";
import {
  blockAuthor,
  deleteMyStory,
  reportStory,
  toggleHeart,
  type ReportResult,
} from "@/lib/story-actions.functions";
import type { PlateStory } from "@/lib/stories.functions";

export const ACTION_ERROR = "Something went wrong. Please try again.";
export const REPORT_SENT = "Thanks. Your report was sent.";
export const REPORT_ALREADY = "You've already reported this story.";

type Story = Pick<PlateStory, "id" | "handle" | "hearts" | "hearted" | "isOwn">;

/** The heart button: one per person, tap again to remove; signed out goes to sign in. */
export function HeartButton({ story, plateId }: { story: Story; plateId: string }) {
  const auth = useAccountAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toggle = useServerFn(toggleHeart);
  const [hearted, setHearted] = useState(story.hearted);
  const [count, setCount] = useState(story.hearts);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function onClick() {
    if (!auth?.account) {
      await navigate({ to: "/sign-in", search: { returnTo: `/plate/${plateId}` } });
      return;
    }
    setBusy(true);
    setMessage("");
    const next = !hearted;
    try {
      const result = await toggle({ data: { storyId: story.id, hearted: next } });
      if (result.outcome === "demo") {
        setMessage(result.message);
        void track("demo_write_refused", { action: next ? "heart" : "unheart" });
      } else if (result.outcome === "error") setMessage(ACTION_ERROR);
      else {
        setHearted(next);
        setCount((c) => c + (next ? 1 : -1));
        void track(next ? "story_hearted" : "story_unhearted", {});
        void queryClient.invalidateQueries({ queryKey: ["plate-stories", plateId] });
      }
    } catch {
      setMessage(ACTION_ERROR);
    }
    setBusy(false);
  }
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-pressed={hearted}
        disabled={busy}
        onClick={() => void onClick()}
        className="flex items-center gap-1 text-sm"
      >
        <Heart aria-hidden className={`size-4 text-coral ${hearted ? "fill-current" : ""}`} />
        <span>{count}</span>
        <span className="sr-only">{count === 1 ? "heart" : "hearts"}</span>
      </button>
      {message && (
        <p role="status" className="mt-1 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}

type Open = "menu" | "report" | "delete" | null;

/** The story menu with its dialogs. Signed-out visitors see nothing; demo sees it and is refused. */
export function StoryMenuActions({ story, plateId }: { story: Story; plateId: string }) {
  const auth = useAccountAuth();
  const queryClient = useQueryClient();
  const report = useServerFn(reportStory);
  const block = useServerFn(blockAuthor);
  const remove = useServerFn(deleteMyStory);
  const [open, setOpen] = useState<Open>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  useMenuDismiss(open === "menu", () => setOpen(null), containerRef);
  if (!auth?.account) return null;
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["plate-stories", plateId] });
    void queryClient.invalidateQueries({ queryKey: ["plate-summary", plateId] });
  };
  async function run<R extends { outcome: string; message?: string }>(
    action: () => Promise<R>,
    done: (result: R) => void,
    actionName: string,
  ) {
    setBusy(true);
    setMessage("");
    try {
      const result = await action();
      if (result.outcome === "demo") {
        setMessage(result.message ?? "");
        void track("demo_write_refused", { action: actionName });
      } else if (result.outcome === "error" || result.outcome === "validation")
        setMessage(ACTION_ERROR);
      else done(result);
    } catch {
      setMessage(ACTION_ERROR);
    }
    setBusy(false);
    setOpen(null);
  }
  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={moreRef}
        type="button"
        aria-label={`More options for ${story.handle}'s story`}
        aria-expanded={open === "menu"}
        onClick={() => setOpen(open === "menu" ? null : "menu")}
        className="text-muted-foreground"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </button>
      {open === "menu" && (
        <StoryMenuList
          handle={story.handle}
          menu={story.isOwn ? "own" : "other"}
          className="brand-card absolute right-0 top-8 z-10 w-56 p-2 shadow-md"
          onReport={() => setOpen("report")}
          onDelete={() => setOpen("delete")}
          onBlock={() =>
            void run(
              () => block({ data: { storyId: story.id } }),
              () => {
                void track("user_blocked", {});
                refresh();
              },
              "block",
            )
          }
        />
      )}
      <ReportDialog
        open={open === "report"}
        onOpenChange={(v) => {
          setOpen(v ? "report" : null);
          if (!v) moreRef.current?.focus();
        }}
        busy={busy}
        onSend={(reason, note) =>
          void run<ReportResult>(
            () => report({ data: { storyId: story.id, reason, note } }),
            (result) => {
              if (result.outcome === "already") setMessage(REPORT_ALREADY);
              else {
                setMessage(REPORT_SENT);
                void track("story_reported", { reason });
              }
            },
            "report",
          )
        }
      />
      <DeleteStoryDialog
        open={open === "delete"}
        onOpenChange={(v) => {
          setOpen(v ? "delete" : null);
          if (!v) moreRef.current?.focus();
        }}
        busy={busy}
        onDelete={() =>
          void run(
            () => remove({ data: { storyId: story.id } }),
            () => {
              void track("story_deleted", {});
              refresh();
            },
            "delete_story",
          )
        }
      />
      {message && (
        <p role="status" className="mt-1 max-w-64 text-right text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
