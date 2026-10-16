import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { PlateHeader } from "@/components/site/AddStory";

const field = "h-11 w-full rounded-lg border border-input bg-card px-3";

/** Simple centred form card, with the small signpost beside it on desktop only. */
function EntryShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex max-w-3xl items-center justify-center gap-8 px-4 py-10 sm:py-16">
      <img
        src="/brand/signpost-v1.webp"
        alt=""
        width={700}
        height={1050}
        data-testid="signpost"
        className="hidden h-40 w-auto shrink-0 md:block"
      />
      <section className="brand-card w-full max-w-md p-6 sm:p-8">
        <h1 className="font-display text-4xl text-navy">{title}</h1>
        <p className="mt-2 text-lg">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

function PasswordField({ hint }: { hint?: string }) {
  const [shown, setShown] = useState(false);
  return (
    <div>
      <label htmlFor="password" className="mb-1 block font-semibold">
        Password
      </label>
      <div className="relative">
        <input
          id="password"
          type={shown ? "text" : "password"}
          autoComplete={hint ? "new-password" : "current-password"}
          aria-describedby={hint ? "password-hint" : undefined}
          className={`${field} pr-12`}
        />
        <button
          type="button"
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          onClick={() => setShown((v) => !v)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-navy"
        >
          {shown ? (
            <EyeOff aria-hidden className="size-5" />
          ) : (
            <Eye aria-hidden className="size-5" />
          )}
        </button>
      </div>
      {hint && (
        <p id="password-hint" className="mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function EmailField() {
  return (
    <div>
      <label htmlFor="email" className="mb-1 block font-semibold">
        Email
      </label>
      <input id="email" type="email" autoComplete="email" className={field} />
    </div>
  );
}

const link = "font-semibold text-teal underline underline-offset-4";

export function SignInPage() {
  return (
    <EntryShell title="Sign In" subtitle="Welcome back!">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <EmailField />
        <PasswordField />
        <button type="submit" className="brand-btn brand-btn-navy w-full">
          Sign In
        </button>
      </form>
      <p className="mt-5 text-center">
        <Link to="/sign-up" className={link}>
          Create an account
        </Link>
      </p>
    </EntryShell>
  );
}

export function SignUpPage() {
  return (
    <EntryShell title="Create an Account" subtitle="Join the community and add your story.">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        <EmailField />
        <PasswordField hint="Use at least 8 characters" />
        <button type="submit" className="brand-btn brand-btn-coral w-full">
          Create Account
        </button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground">
        We'll give you a handle to start. You can change it anytime in your profile.
      </p>
      <p className="mt-5 text-center">
        Already have an account?{" "}
        <Link to="/sign-in" className={link}>
          Sign in
        </Link>
      </p>
    </EntryShell>
  );
}

export const DEMO_SEES = ["Your submissions", "A story waiting for its check", "Your profile"];

export function DemoPage() {
  return (
    <EntryShell
      title="Try the Demo"
      subtitle="Look around as a sample traveler. You'll see what contributors see, but nothing can be changed."
    >
      <h2 className="font-semibold">What you'll see</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {DEMO_SEES.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <Link to="/demo-form" className="brand-btn brand-btn-navy mt-6 w-full">
        Start the Demo
      </Link>
    </EntryShell>
  );
}

const CHOICES = [
  { to: "/sign-in", label: "Sign In", caption: "I already have an account", cls: "brand-btn-navy" },
  { to: "/sign-up", label: "Create an Account", caption: "I'm new here", cls: "brand-btn-coral" },
  {
    to: "/demo",
    label: "Try the Demo",
    caption: "Look around as a sample traveler",
    cls: "brand-btn-outline",
  },
] as const;

export function SignInPromptPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-10">
      <PlateHeader />
      <h1 className="font-display text-3xl text-navy sm:text-4xl">Add Your Story</h1>
      <section aria-labelledby="prompt-title" className="brand-card mx-auto max-w-lg p-6 sm:p-8">
        <h2 id="prompt-title" className="font-display text-2xl text-navy">
          Sign in to add your story
        </h2>
        <p className="mt-2">
          Choose how you'd like to continue. After signing in, you'll return here to add your
          story.
        </p>
        <ul className="mt-6 space-y-4">
          {CHOICES.map((c) => (
            <li key={c.to}>
              <Link
                to={c.to}
                aria-describedby={`cap-${c.to.slice(1)}`}
                className={`brand-btn ${c.cls} w-full`}
              >
                {c.label}
              </Link>
              <p
                id={`cap-${c.to.slice(1)}`}
                className="mt-1 text-center text-sm text-muted-foreground"
              >
                {c.caption}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center">
          <Link to="/plate/$state" params={{ state: "pnw-lv" }} className={link}>
            Back to this plate
          </Link>
        </p>
      </section>
    </main>
  );
}
