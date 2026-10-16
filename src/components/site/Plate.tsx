import { cn } from "@/lib/utils";
import { plateFontSize, plateTone } from "@/lib/jurisdictions";

export type PlateSize = "sm" | "md" | "lg";

const WIDTHS: Record<PlateSize, string> = {
  sm: "w-32",
  md: "w-60",
  lg: "w-[26rem]",
};

export interface PlateProps {
  jurisdiction: string;
  text: string;
  size?: PlateSize;
  className?: string;
}

export function Plate({ jurisdiction, text, size = "md", className }: PlateProps) {
  const tone = plateTone(jurisdiction);
  return (
    <div
      role="img"
      aria-label={`${jurisdiction} plate ${text}`}
      data-size={size}
      className={cn("plate relative aspect-[2/1] max-w-full", WIDTHS[size], className)}
    >
      <img
        src="/brand/generic-plate-background-v1.webp"
        alt=""
        className="absolute inset-0 h-full w-full object-contain"
        draggable={false}
      />
      <div className="absolute inset-x-[9%] top-[17%] bottom-[17%] flex flex-col items-center justify-between">
        <span data-tone={tone} className="plate-jurisdiction">
          {jurisdiction}
        </span>
        <span className="plate-text" style={{ fontSize: plateFontSize(text) }}>
          {text}
        </span>
        <span aria-hidden className="h-[6cqw]" />
      </div>
    </div>
  );
}
