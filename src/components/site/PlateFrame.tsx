import { Plate } from "@/components/site/Plate";

export function PlateFrame({ jurisdiction, text }: { jurisdiction: string; text: string }) {
  return (
    <div className="min-w-0 rounded-2xl border-8 border-navy bg-card p-6 shadow-md">
      <h1 className="sr-only">
        {jurisdiction} plate {text}
      </h1>
      <Plate jurisdiction={jurisdiction} text={text} size="lg" className="mx-auto min-w-0" />
      <p
        aria-hidden="true"
        className="mx-auto mt-3 w-[26rem] max-w-full text-center text-foreground"
      >
        {jurisdiction}
      </p>
    </div>
  );
}
