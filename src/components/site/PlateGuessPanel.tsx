import { useCallback, useRef } from "react";
import { track } from "@/lib/analytics";

export function GuessTeaser() {
  return (
    <div className="mt-5 border-t border-teal pt-4">
      <p className="font-semibold text-teal">We've got a guess waiting.</p>
      <p className="mt-1 text-sm">
        What the Plate? has imagined a fictional meaning for these letters and numbers. Add the
        first story to reveal it.
      </p>
    </div>
  );
}

export function PlateGuessPanel({
  plateId,
  meaning,
  story,
}: {
  plateId: string;
  meaning: string;
  story: string;
}) {
  const seen = useRef<string | null>(null);
  const panel = useCallback(
    (element: HTMLElement) => {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting) && seen.current !== plateId) {
          seen.current = plateId;
          void track("ai_guess_revealed", {});
        }
      });
      observer.observe(element);
      return () => observer.disconnect();
    },
    [plateId],
  );
  return (
    <section
      ref={panel}
      aria-labelledby="plate-guess-heading"
      className="rounded-lg border border-teal bg-teal-pale p-5"
    >
      <p className="text-xs font-semibold text-teal">Fictional · AI-written</p>
      <h2 id="plate-guess-heading" className="mt-1 font-display text-2xl">
        What the Plate?'s guess
      </h2>
      <p className="mt-3 break-words font-sans font-bold">{meaning}</p>
      <p className="mt-2 break-words font-sans">{story}</p>
      <p className="mt-4 text-xs text-muted-foreground">
        An imagined interpretation of the plate's letters and numbers. Not a claim about a car or
        person. It doesn't count as a story or contribute to The Story So Far.
      </p>
    </section>
  );
}
