import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ScenicHeader } from "@/components/site/SpotPlate";
import { BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/mock-data";

export function AboutPage() {
  return (
    <main>
      <ScenicHeader asHeading title="About What the Plate?" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-8 text-lg">
        <p>
          What the Plate? started with a family member who kept spotting personalized plates on road
          trips and wishing there was a place to collect the stories behind them. Every plate has a
          reason, and most of them never get told.
        </p>
        <p>
          Anyone can look up a plate, share what they think it means, and see where people agree and
          where they disagree. The Story So Far gathers those readings into one summary, so a plate's
          meaning grows as more people weigh in.
        </p>
        <p>It was built for #SheBuilds, with love for everyone who reads the road.</p>
      </div>
    </main>
  );
}

function PrivacySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="brand-card p-6">
      <h2 className="font-display text-2xl text-navy">{title}</h2>
      <p className="mt-3">{children}</p>
    </section>
  );
}

export function PrivacyPage() {
  return (
    <main>
      <ScenicHeader asHeading title="Privacy" />
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <PrivacySection title="What we store">
          We store your handle, your email address, the plates you spot, and the stories you share.
          That's it.
        </PrivacySection>
        <PrivacySection title="Photos">
          When you add a photo, the original is sent for plate detection and is never stored. Only
          the blurred version is uploaded, and location data is removed before anything is saved.
        </PrivacySection>
        <PrivacySection title="What the AI sees">
          The AI reads the stories on a plate to write The Story So Far. It never sees your email
          address, and it only works with stories that have passed their safety check.
        </PrivacySection>
        <PrivacySection title="Blocking">{BLOCKING_EXPLANATION}</PrivacySection>
        <PrivacySection title="Deleting your stories and account">
          You can delete any of your stories at any time. {DELETE_ACCOUNT_WARNING}
        </PrivacySection>
      </div>
    </main>
  );
}

export function ContactPage() {
  return (
    <main>
      <ScenicHeader asHeading title="Contact" />
      <div className="mx-auto max-w-2xl px-4 py-8 text-lg">
        <p>
          Questions, ideas, or a plate we should feature? We'd love to hear from you at{" "}
          <a href="mailto:hello@example.com" className="font-semibold text-navy underline">
            hello@example.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}

export function NotFoundPage() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <img
        src="/brand/sasquatch-v1.webp"
        alt=""
        width={700}
        height={727}
        data-testid="sasquatch"
        className="h-48 w-auto"
      />
      <h1 className="mt-6 font-display text-4xl text-navy">This road doesn't go anywhere.</h1>
      <Link to="/explore" className="brand-btn brand-btn-navy mt-6">
        Back to Explore
      </Link>
    </main>
  );
}
