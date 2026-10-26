import { createFileRoute, notFound } from "@tanstack/react-router";
import { PreviewScreen } from "@/components/previews/PreviewScreens";
import { findPreview, previewHead } from "@/lib/preview-registry";

export const Route = createFileRoute("/previews_/$screen")({
  loader: ({ params }) => {
    const entry = findPreview(params.screen);
    if (!entry) throw notFound();
    return { entry };
  },
  head: ({ loaderData }) => previewHead(loaderData?.entry),
  component: PreviewScreenRoute,
});

function PreviewScreenRoute() {
  const { entry } = Route.useLoaderData();
  return <PreviewScreen slug={entry.slug} />;
}
