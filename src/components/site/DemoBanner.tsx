import { Info } from "lucide-react";

/** The read-only banner shown across the top of the content in demo mode. */
export function DemoBanner() {
  return (
    <div
      role="status"
      data-testid="demo-banner"
      className="flex items-start gap-2 rounded-xl border-2 border-teal bg-cream-warm p-4"
    >
      <Info aria-hidden className="mt-0.5 size-5 shrink-0 text-teal" />
      <p>
        You're exploring the demo. You can look around, but adding plates and stories is turned off.
      </p>
    </div>
  );
}
