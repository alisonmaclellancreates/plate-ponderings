import { useQuery } from "@tanstack/react-query";
import { getPlateGuess } from "@/lib/plate-guesses.functions";
import { HeartButton, StoryMenuActions } from "@/components/site/StoryActions";
import { PlateDetailView } from "@/components/site/PlateDetailView";
import { useAccountAuth } from "@/lib/account-auth";
import { getPlateSummary } from "@/lib/summaries.functions";
import { getPlateStories } from "@/lib/stories.functions";

/** A real published plate: loads stories, summary and guess, then renders the shared view. */
export function RealPlateDetail({
  plate,
  backToSearch,
  from,
}: {
  plate: { id: string; jurisdiction: string; text: string };
  backToSearch?: { jurisdiction: string; text: string } | undefined;
  from?: "submissions" | undefined;
}) {
  const signedIn = Boolean(useAccountAuth()?.account);
  const { data: stories } = useQuery({
    queryKey: ["plate-stories", plate.id],
    queryFn: () => getPlateStories({ data: { plateId: plate.id } }),
  });
  const { data: summary } = useQuery({
    queryKey: ["plate-summary", plate.id],
    queryFn: () => getPlateSummary({ data: { plateId: plate.id } }),
  });
  const { data: guess } = useQuery({
    queryKey: ["plate-guess", plate.id],
    queryFn: () => getPlateGuess({ data: { plateId: plate.id } }),
  });
  return (
    <PlateDetailView
      plate={plate}
      backToSearch={backToSearch}
      from={from}
      signedIn={signedIn}
      stories={stories ?? undefined}
      summary={summary}
      guess={guess}
      actions={(story) => ({
        menu: <StoryMenuActions story={story} plateId={plate.id} />,
        heart: <HeartButton story={story} plateId={plate.id} />,
      })}
    />
  );
}
