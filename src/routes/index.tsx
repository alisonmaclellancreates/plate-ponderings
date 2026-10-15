import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "What the Plate?" },
      { name: "description", content: "Every plate has a story." },
      { property: "og:title", content: "What the Plate?" },
      { property: "og:description", content: "Every plate has a story." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="starting-screen">
      <div>
        <h1>What the Plate?</h1>
        <p>Every plate has a story.</p>
      </div>
    </main>
  );
}
