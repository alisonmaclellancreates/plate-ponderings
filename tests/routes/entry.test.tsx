import { expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (o: Record<string, unknown>) => o,
}));
vi.mock("@/components/site/Entry", () => ({
  SignInPromptPage: () => <p>prompt</p>,
  SignInPage: () => <p>signin</p>,
  SignUpPage: () => <p>signup</p>,
  DemoPage: () => <p>demo</p>,
}));
vi.mock("@/components/site/AddStory", () => ({
  StoryStepOne: ({ demo }: { demo?: boolean }) => <p>{demo ? "demo-form" : "form"}</p>,
}));

import { Route as Prompt } from "@/routes/sign-in-prompt";
import { Route as SignIn } from "@/routes/sign-in";
import { Route as SignUp } from "@/routes/sign-up";
import { Route as Demo } from "@/routes/demo";
import { Route as DemoForm } from "@/routes/demo-form";

type R = { head: () => { meta: Record<string, string>[] }; component: () => ReactNode };

it.each([
  [Prompt, "prompt", "Sign in to add your story"],
  [SignIn, "signin", "Sign In"],
  [SignUp, "signup", "Create an Account"],
  [Demo, "demo", "Try the Demo"],
  [DemoForm, "demo-form", "Demo"],
])("renders with matching titles", (route, text, title) => {
  const r = route as unknown as R;
  const C = r.component;
  expect(render(<C />).container.textContent).toBe(text);
  const meta = r.head().meta;
  const t = meta.find((m) => "title" in m)?.["title"];
  expect(t).toContain(title);
  expect(meta.find((m) => m["property"] === "og:title")?.["content"]).toBe(t);
});
