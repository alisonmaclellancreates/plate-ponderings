import { createFileRoute } from "@tanstack/react-router";
import { SubmissionsPage } from "@/components/site/Account";
import { SUBMISSIONS_SAMPLE } from "@/lib/mock-data";

const TITLE = "Your Submissions sample preview | What the Plate?";
const DESCRIPTION = "Sample plates and stories in every status, some marked Updated.";

export const Route = createFileRoute("/previews_/submissions")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SubmissionsSample,
});

/** Dismiss is intentionally inert: sample data only, nothing to delete. */
function SubmissionsSample() {
  return <SubmissionsPage rows={SUBMISSIONS_SAMPLE} onDismiss={() => {}} />;
}
