import { createFileRoute } from "@tanstack/react-router";
import { SettingsPage } from "@/components/site/Settings";

/** Sample blocked people only; Unblock does nothing here. */
function SettingsSample() {
  return <SettingsPage onUnblock={() => {}} />;
}

const TITLE = "Settings sample preview | What the Plate?";
const DESCRIPTION = "Sample blocked people with an inert Unblock.";

export const Route = createFileRoute("/previews_/settings")({
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
  component: SettingsSample,
});
