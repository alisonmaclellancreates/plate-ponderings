import { Plate } from "@/components/site/Plate";

/** Small plate with its name: beside it on desktop, a compact strip on phones. */
export function PlateHeader({ plate: shown }: { plate: { jurisdiction: string; text: string } }) {
  return (
    <div
      data-testid="plate-header"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 sm:gap-4 sm:px-4 sm:py-3"
    >
      <Plate
        jurisdiction={shown.jurisdiction}
        text={shown.text}
        size="sm"
        className="w-20 sm:w-32"
      />
      <p className="min-w-0 text-sm sm:text-lg">
        <span className="font-semibold">{shown.text}</span>
        <span className="text-muted-foreground"> · {shown.jurisdiction}</span>
      </p>
    </div>
  );
}
