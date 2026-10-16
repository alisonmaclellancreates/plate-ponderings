import { useEffect, useState } from "react";

export const HEADLINES = [
  "Every plate has a story.",
  "Little plates. Big stories.",
  "Spotted a plate? Let's solve it.",
] as const;

export const ROTATE_MS = 9000;

/**
 * Desktop: soft rotation every 9s, held on the first headline for reduced motion.
 * Mobile: one random headline per visit, no rotation. Starts at 0 so SSR and hydration match.
 */
export function useHeadlineIndex(): number {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    if (mobile) {
      setIndex(Math.floor(Math.random() * HEADLINES.length));
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % HEADLINES.length), ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);
  return index;
}
