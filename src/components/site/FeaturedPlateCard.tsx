import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Plate } from "@/components/site/Plate";
import { StatusBadge } from "@/components/site/Badges";
import { formatDay } from "@/lib/format-day";
import { storyCount } from "@/lib/story-count";
import { featuredProgress, plateStatus, publishedStories, type PlateRecord } from "@/lib/mock-data";

export function FeaturedPlateCard({ plate, today = false }: { plate: PlateRecord; today?: boolean }) {
  const count = publishedStories(plate).length;
  return (
    <Link
      to="/plate/$state"
      params={{ state: plate.slug }}
      aria-label={`${plate.jurisdiction} plate ${plate.text}`}
      className="brand-card flex h-full flex-col items-center gap-3 p-4 text-center transition-shadow hover:shadow-md"
    >
      <Plate jurisdiction={plate.jurisdiction} text={plate.text} size="md" className="max-w-full" />
      <p className="text-sm text-muted-foreground">
        Featured {formatDay(plate.plateOfTheDay ?? "")}
        {today && <span className="ml-2 rounded bg-gold px-2 py-0.5 text-xs font-semibold text-navy">Today</span>}
      </p>
      <p className="flex items-center gap-1 font-semibold">
        <MessageCircle aria-hidden className="size-4" />
        {storyCount(count)}
      </p>
      <StatusBadge status={plateStatus(plate)} />
      <p className="text-sm">{featuredProgress(plate.featuredStoryCount ?? 0, count)}</p>
    </Link>
  );
}