import { createFileRoute } from "@tanstack/react-router";
import { ContactPage } from "@/components/site/InfoPages";

const TITLE = "Contact | What the Plate?";
const DESCRIPTION = "Questions, ideas, or a plate we should feature? Get in touch.";

export const Route = createFileRoute("/contact")({
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
  component: () => <ContactPage />,
});
