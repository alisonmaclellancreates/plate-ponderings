import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { spotPlate, type SpotResult } from "@/lib/plates.functions";
import { useAccountAuth } from "@/lib/account-auth";
import { track } from "@/lib/analytics";
import type { SpotValues } from "@/lib/spot";
import { CheckingView, SpotOutcomeView, SpotPageView } from "@/components/site/SpotViews";

export { Outcome, ScenicHeader, SpotForm } from "@/components/site/SpotViews";

type SpotStage = { kind: "form" } | { kind: "checking" } | { kind: "result"; result: SpotResult };

/** The live Spot a Plate flow: form, checking, then the real outcome. */
export function SpotLivePage({ values }: { values?: SpotValues | undefined }) {
  const auth = useAccountAuth();
  const spot = useServerFn(spotPlate);
  const [stage, setStage] = useState<SpotStage>({ kind: "form" });
  const [submittedValues, setSubmittedValues] = useState<{
    jurisdiction: string;
    text: string;
  }>();
  const isDemo = Boolean(auth?.account?.isDemo);
  async function onSpot(next: { jurisdiction: string; text: string }) {
    setSubmittedValues(next);
    setStage({ kind: "checking" });
    try {
      const result = await spot({ data: next });
      setStage({ kind: "result", result });
      if (result.outcome === "demo") await track("demo_write_refused", { action: "spot_plate" });
      const outcome =
        result.outcome === "already-spotted"
          ? "already_spotted"
          : result.outcome === "rate-limited"
            ? "rate_limited"
            : result.outcome === "new" ||
                result.outcome === "exists" ||
                result.outcome === "pending" ||
                result.outcome === "rejected"
              ? result.outcome
              : "error";
      await track("subject_spotted", { outcome });
    } catch {
      setStage({ kind: "result", result: { outcome: "error" } });
      await track("subject_spotted", { outcome: "error" });
    }
  }
  if (stage.kind === "checking") return <CheckingView />;
  if (stage.kind === "result" && stage.result.outcome !== "already-spotted")
    return <SpotOutcomeView result={stage.result} />;
  return (
    <SpotPageView
      values={submittedValues ?? values}
      isDemo={isDemo}
      onSpot={onSpot}
      alreadySpotted={
        stage.kind === "result" && stage.result.outcome === "already-spotted"
          ? submittedValues
          : undefined
      }
    />
  );
}
