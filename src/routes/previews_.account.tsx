import { createFileRoute } from "@tanstack/react-router";
import { HandleField } from "@/components/site/Account";
import { SignInForm, SignUpForm } from "@/components/site/Entry";
import { AiCheckStatusPanel } from "@/components/site/AiCheckStatus";
import {
  HANDLE_REJECTED,
  SIGN_IN_ERROR,
  SIGN_UP_ERROR,
  WEAK_PASSWORD_ERROR,
  BREACHED_PASSWORD_ERROR,
} from "@/lib/account-rules";

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
    </Section>
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

const inertSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

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
      <Section title="AI check status, Ready">
        <AiCheckStatusPanel status={{ allowed: true, category: null }} />
      </Section>
      <Section title="AI check status, Blocked">
        <AiCheckStatusPanel
          status={{
            allowed: true,
            category: "credit_block",
            blockedAt: "2026-10-17T01:00:00.000Z",
          }}
        />
      </Section>
      <Section title="Sign in, wrong password">
        <SignInForm busy={false} error={SIGN_IN_ERROR} submit={inertSubmit} />
      </Section>
      <Section title="Sign up, email already has an account">
        <SignUpForm busy={false} error={SIGN_UP_ERROR} submit={inertSubmit} />
      </Section>
      <Section title="Sign up, weak password">
        <SignUpForm busy={false} error={WEAK_PASSWORD_ERROR} submit={inertSubmit} />
      </Section>
      <Section title="Sign up, breached password">
        <SignUpForm busy={false} error={BREACHED_PASSWORD_ERROR} submit={inertSubmit} />
      </Section>
    </main>
  );
}
