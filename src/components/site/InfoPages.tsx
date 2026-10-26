import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ScenicHeader } from "@/components/site/SpotViews";
import { BLOCKING_EXPLANATION, DELETE_ACCOUNT_WARNING } from "@/lib/domain";
import walkthroughAsset from "@/assets/walkthrough.mp4.asset.json";

export const CONTACT_EMAIL = "hello@sailawaystudios.net";

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
          where they disagree. The Story So Far gathers those readings into one summary, so a
          plate's meaning grows as more people weigh in.
        </p>
        <p>It was built for #SheBuilds, with love for everyone who reads the road.</p>
        <section className="brand-card p-6" aria-label="App walkthrough video">
          <h2 className="font-display text-2xl text-navy">See the app in action</h2>
          <video
            src={walkthroughAsset.url}
            controls
            preload="metadata"
            playsInline
            className="mt-3 w-full rounded-lg"
          >
            <track kind="captions" label="Walkthrough captions" />
            Your browser can't play this video here.{" "}
            <a href={walkthroughAsset.url} download className="font-semibold text-navy underline">
              Download the walkthrough
            </a>{" "}
            instead.
          </video>
          <p className="mt-3 text-base">A quick tour of spotting plates and sharing stories.</p>
        </section>
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
          Your email address and handle, the plates you spot, your stories and their blurred photos,
          the hearts you give, the reports you send, the people you block, and your notifications.
          We also keep the summaries written from published stories, and their history.
        </PrivacySection>
        <PrivacySection title="Photos">
          When you add a photo, the original is sent for plate detection and is never stored by our
          application. Only the blurred version is uploaded, and location data is removed before
          anything is saved.
        </PrivacySection>
        <PrivacySection title="What the AI sees">
          Our safety checks use AI to review each new plate, each story before it's published, and
          each handle, so they see submissions before anyone else does. Separately, the AI reads
          published stories to write The Story So Far. It's shown your photo once, to find the
          plate, and it never sees your email address.
        </PrivacySection>
        <PrivacySection title="Analytics">
          We use PostHog to understand how the site is used. It receives which pages were viewed and
          which actions were taken, tied to an account id. It never receives story text or contact
          details. Deleting your account deletes that data too.
        </PrivacySection>
        <PrivacySection title="Blocking">{BLOCKING_EXPLANATION}</PrivacySection>
        <PrivacySection title="Deleting your published stories and your account">
          You can delete any of your published stories. {DELETE_ACCOUNT_WARNING}
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
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-navy underline">
            {CONTACT_EMAIL}
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
