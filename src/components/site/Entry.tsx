import { useId, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { PlateHeader } from "@/components/site/AddStory";
import { DEMO_SEES } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccountAuth } from "@/lib/account-auth";
import {
  plateIdOrNull,
  safeReturnPath,
  storyReturnPath,
  signupErrorMessage,
  SIGN_IN_ERROR,
  SIGN_UP_ERROR,
} from "@/lib/account-rules";
import { Navigate, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlate } from "@/lib/plates.functions";
import { startDemo } from "@/lib/demo-login.functions";
import { track } from "@/lib/analytics";

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

function PasswordField({ hint, describedBy }: { hint?: string; describedBy?: string | undefined }) {
  const [shown, setShown] = useState(false);
  const uid = useId();
  const id = `password-${uid}`;
  const hintId = `password-hint-${uid}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold">
        Password
      </label>
      <div className="relative">
        <input
          id={id}
          name="password"
          required
          minLength={hint ? 8 : undefined}
          type={shown ? "text" : "password"}
          autoComplete={hint ? "new-password" : "current-password"}
          aria-describedby={
            [hint ? hintId : "", describedBy ?? ""].filter(Boolean).join(" ") || undefined
          }
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
        <p id={hintId} className="mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function EmailField({ describedBy }: { describedBy?: string | undefined }) {
  const uid = useId();
  const id = `email-${uid}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block font-semibold">
        Email
      </label>
      <input
        id={id}
        name="email"
        required
        type="email"
        autoComplete="email"
        aria-describedby={describedBy}
        className={field}
      />
    </div>
  );
}

/** Account error: coral text with a decorative warning icon, announced on appear. */
function FormError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-coral-cta">
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      {children}
    </p>
  );
}

const link = "font-semibold text-teal underline underline-offset-4";

function useEntry(kind: "signed_in" | "signed_up", returnTo: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const auth = useAccountAuth();
  const navigate = useNavigate();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    if (!email || !password) return;
    setBusy(true);
    setError("");
    try {
      const result =
        kind === "signed_up"
          ? await supabase.auth.signUp({ email, password })
          : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(kind === "signed_up" ? signupErrorMessage(result.error) : SIGN_IN_ERROR);
        return;
      }
      if (!result.data.session) {
        setError("Your account couldn't be signed in. Please try signing in.");
        return;
      }
      await auth?.completeSignIn(kind);
      await navigate({ to: safeReturnPath(returnTo) });
    } catch {
      setError(kind === "signed_up" ? SIGN_UP_ERROR : SIGN_IN_ERROR);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, submit };
}
type EntryFormProps = {
  busy: boolean;
  error: string;
  submit: (e: React.FormEvent<HTMLFormElement>) => void;
};

/** Inert submit for previews: never calls the server. */
const inertSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};

export function SignInForm({ busy, error, submit }: EntryFormProps) {
  const errorId = useId();
  const describedBy = error ? errorId : undefined;
  return (
    <form className="space-y-4" onSubmit={submit}>
      <EmailField describedBy={describedBy} />
      <PasswordField describedBy={describedBy} />
      {error && <FormError id={errorId}>{error}</FormError>}
      <Button type="submit" disabled={busy} className="brand-btn brand-btn-navy w-full">
        Sign In
      </Button>
    </form>
  );
}

export function SignUpForm({ busy, error, submit }: EntryFormProps) {
  const errorId = useId();
  const describedBy = error ? errorId : undefined;
  return (
    <form className="space-y-4" onSubmit={submit}>
      <EmailField describedBy={describedBy} />
      <PasswordField hint="Use at least 8 characters" describedBy={describedBy} />
      {error && <FormError id={errorId}>{error}</FormError>}
      <Button type="submit" disabled={busy} className="brand-btn brand-btn-coral w-full">
        Create Account
      </Button>
    </form>
  );
}

export function SignInPage({
  returnTo = "/",
  previewError,
}: {
  returnTo?: string;
  previewError?: string;
}) {
  const { busy, error, submit } = useEntry("signed_in", returnTo);
  const preview = previewError !== undefined;
  return (
    <EntryShell title="Sign In" subtitle="Welcome back!">
      <SignInForm
        busy={preview ? false : busy}
        error={preview ? previewError : error}
        submit={preview ? inertSubmit : submit}
      />
      <p className="mt-5 text-center">
        <Link to="/sign-up" search={{ returnTo: safeReturnPath(returnTo) }} className={link}>
          Create an account
        </Link>
      </p>
    </EntryShell>
  );
}

export function SignUpPage({
  returnTo = "/",
  previewError,
}: {
  returnTo?: string;
  previewError?: string;
}) {
  const { busy, error, submit } = useEntry("signed_up", returnTo);
  const preview = previewError !== undefined;
  return (
    <EntryShell title="Create an Account" subtitle="Join the community and add your story.">
      <SignUpForm
        busy={preview ? false : busy}
        error={preview ? previewError : error}
        submit={preview ? inertSubmit : submit}
      />
      <p className="mt-4 text-sm text-muted-foreground">
        We'll give you a handle to start. You can change it anytime in your profile.
      </p>
      <p className="mt-5 text-center">
        Already have an account?{" "}
        <Link to="/sign-in" search={{ returnTo: safeReturnPath(returnTo) }} className={link}>
          Sign in
        </Link>
      </p>
    </EntryShell>
  );
}

export function DemoPage() {
  const begin = useServerFn(startDemo);
  const navigate = useNavigate();
  const auth = useAccountAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function enterDemo() {
    setBusy(true);
    setError("");
    try {
      const session = await begin();
      const result = await supabase.auth.setSession(session);
      if (result.error) throw result.error;
      await auth?.refresh();
      await track("demo_started", {});
      await navigate({ to: "/" });
    } catch {
      setError("The demo is not available right now. Please try again soon.");
    } finally {
      setBusy(false);
    }
  }
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
      <Button className="brand-btn brand-btn-navy mt-6 w-full" disabled={busy} onClick={() => void enterDemo()}>
        {busy ? "Starting the Demo…" : "Start the Demo"}
      </Button>
      {error && <p role="alert" className="mt-3 text-coral-cta">{error}</p>}
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

/**
 * The sign-in prompt for one real plate. It looks the plate up by id (published only) and
 * never falls back to another plate: a missing, malformed or unpublished id shows a way on instead.
 */
export function SignInPromptPage({ plateId }: { plateId?: string | undefined } = {}) {
  const id = plateIdOrNull(plateId);
  const lookup = useServerFn(getPlate);
  const auth = useAccountAuth();
  const { data, isPending } = useQuery({
    queryKey: ["sign-in-prompt-plate", id],
    queryFn: () => lookup({ data: { id: id as string } }),
    enabled: id !== null,
  });
  const plate = id ? (data?.plate ?? null) : null;
  if (plate && auth?.account)
    return (
      <Navigate to="/story/$step" params={{ step: "1" }} search={{ plate: plate.id }} replace />
    );
  if (id && isPending) return <main className="mx-auto max-w-4xl px-4 py-6 sm:py-10" />;
  if (!plate)
    return (
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-10">
        <h1 className="font-display text-3xl text-navy sm:text-4xl">Add Your Story</h1>
        <section className="brand-card mx-auto max-w-lg p-6 sm:p-8">
          <h2 className="font-display text-2xl text-navy">We couldn't find that plate.</h2>
          <p className="mt-2">Look it up again, or spot it if it's new to the collection.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/" hash="plate-search" className="brand-btn brand-btn-coral">
              Look Up a Plate
            </Link>
            <Link to="/spot" className="brand-btn brand-btn-outline">
              Spot a Plate
            </Link>
          </div>
          <p className="mt-6 text-center">
            <Link to="/explore" className={link}>
              Explore
            </Link>
          </p>
        </section>
      </main>
    );

  const returnTo = storyReturnPath(plate.id);
  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-10">
      <PlateHeader plate={plate} />
      <h1 className="font-display text-3xl text-navy sm:text-4xl">Add Your Story</h1>
      <section aria-labelledby="prompt-title" className="brand-card mx-auto max-w-lg p-6 sm:p-8">
        <h2 id="prompt-title" className="font-display text-2xl text-navy">
          Sign in to add your story
        </h2>
        <p className="mt-2">
          Choose how you'd like to continue. After signing in, you'll return here to add your story.
        </p>
        <ul className="mt-6 space-y-4">
          {CHOICES.map((c) => (
            <li key={c.to}>
              <Link
                to={c.to}
                search={c.to === "/demo" ? {} : { returnTo }}
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
          <Link to="/plate/$state" params={{ state: plate.id }} className={link}>
            Back to this plate
          </Link>
        </p>
      </section>
    </main>
  );
}
