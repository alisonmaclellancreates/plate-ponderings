import { createFileRoute } from "@tanstack/react-router";
import { HandleField } from "@/components/site/Account";
import { SignInPage, SignUpPage } from "@/components/site/Entry";
import { HandleCheckStatusPanel } from "@/components/site/HandleCheckStatus";
import { HANDLE_REJECTED } from "@/lib/account-rules";

export const Route = createFileRoute("/previews_/account")({
  head: () => ({
    meta: [
      { title: "Account previews | What the Plate?" },
      {
        name: "description",
        content: "Inert previews of account states: handle field, sign-in, sign-up, admin status.",
      },
      { property: "og:title", content: "Account previews | What the Plate?" },
      {
        property: "og:description",
        content: "Inert previews of account states: handle field, sign-in, sign-up, admin status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPreviews,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="brand-card p-6">
      <h2 className="font-display text-2xl text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const HANDLE_STATES = [
  { title: "Handle field, available", props: { draft: "Rowan_Design", status: "available" } },
  { title: "Handle field, taken", props: { draft: "Traveler7444", status: "taken" } },
  { title: "Handle field, reserved", props: { draft: "admin" } },
  { title: "Handle field, invalid characters", props: { draft: "rowan!" } },
  { title: "Handle field, wrong length", props: { draft: "ab" } },
  {
    title: "Handle save, rejected by the check",
    props: { draft: "Rowan_Design", message: HANDLE_REJECTED },
  },
  {
    title: "Handle save, changes saved",
    props: { draft: "Rowan_Design", message: "Changes saved." },
  },
] as const;

function AccountPreviews() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <div>
        <h1 className="font-display text-4xl text-navy">Account previews</h1>
        <p className="mt-2 text-lg">
          Inert previews of account states. Nothing here calls the server or saves anything.
        </p>
      </div>
      {HANDLE_STATES.map((state) => (
        <Section key={state.title} title={state.title}>
          <HandleField {...state.props} />
        </Section>
      ))}
      <Section title="Handle check status, Ready">
        <HandleCheckStatusPanel status={{ allowed: true, category: null }} />
      </Section>
      <Section title="Handle check status, Blocked">
        <HandleCheckStatusPanel
          status={{
            allowed: true,
            category: "credit_block",
            blockedAt: "2026-10-17T01:00:00.000Z",
          }}
        />
      </Section>
      <div className="space-y-2">
        <h2 className="font-display text-2xl text-navy">Sign in, wrong password</h2>
        <SignInPage previewError="We couldn't sign you in. Check your email and password and try again." />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl text-navy">Sign up, email already has an account</h2>
        <SignUpPage previewError="Your account couldn't be created. You can try again or sign in." />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl text-navy">Sign up, weak password</h2>
        <SignUpPage previewError="Please choose a stronger password with at least 8 characters." />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-2xl text-navy">Sign up, breached password</h2>
        <SignUpPage previewError="This password has appeared in a data breach. Please choose a different password." />
      </div>
    </main>
  );
}
