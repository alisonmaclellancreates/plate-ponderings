import { createFileRoute } from "@tanstack/react-router";
import { Plate } from "@/components/site/Plate";
import {
  ConsensusBadge,
  HowIKnowBadge,
  ModerationBadge,
  StatusBadge,
} from "@/components/site/Badges";
import { PLATES, plateStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/preview/components")({
  head: () => ({
    meta: [
      { title: "Plate and badges preview | What the Plate?" },
      {
        name: "description",
        content: "The shared plate component in three sizes and every badge.",
      },
      { property: "og:title", content: "Plate and badges preview | What the Plate?" },
      {
        property: "og:description",
        content: "The shared plate component in three sizes and every badge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComponentsPreview,
});

const EXTRA = [
  { jurisdiction: "Ontario", text: "ILUV2CODE" },
  { jurisdiction: "Washington", text: "HI" },
  { jurisdiction: "Yukon", text: "NORTH" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ComponentsPreview() {
  const all = [...PLATES.map((p) => ({ jurisdiction: p.jurisdiction, text: p.text })), ...EXTRA];
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="font-display text-4xl text-navy">Plate and badges</h1>
      <Section title="Large">
        <div className="flex flex-wrap gap-6">
          <Plate jurisdiction="British Columbia" text="LV2CODE" size="lg" />
          <Plate jurisdiction="Ontario" text="ILUV2CODE" size="lg" />
          <Plate jurisdiction="Washington" text="HI" size="lg" />
        </div>
      </Section>
      <Section title="Medium">
        <div className="flex flex-wrap gap-4">
          {all.map((p) => (
            <Plate key={p.text} {...p} size="md" />
          ))}
        </div>
      </Section>
      <Section title="Small">
        <div className="flex flex-wrap gap-3">
          {all.map((p) => (
            <Plate key={p.text} {...p} size="sm" />
          ))}
        </div>
      </Section>
      <Section title="Badges">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(["mystery", "interpreted", "owner"] as const).map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["agree", "mixed", "differ"] as const).map((c) => (
              <ConsensusBadge key={c} consensus={c} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["owner", "knows", "asked", "guess"] as const).map((h) => (
              <HowIKnowBadge key={h} how={h} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(["published", "pending", "rejected"] as const).map((m) => (
              <ModerationBadge key={m} state={m} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Mock statuses: {PLATES.map((p) => `${p.text} ${plateStatus(p)}`).join(", ")}
          </p>
        </div>
      </Section>
      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="brand-btn brand-btn-navy">
            Explore plates
          </button>
          <button type="button" className="brand-btn brand-btn-coral">
            Add Your Story
          </button>
          <button type="button" className="brand-btn brand-btn-coral" disabled>
            Spot a Plate
          </button>
        </div>
      </Section>
    </main>
  );
}
