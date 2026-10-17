// vitest-axe's own type augmentation targets the legacy global Vi namespace;
// this project augments @vitest/expect (which vitest re-exports) instead.
import type { AxeMatchers } from "vitest-axe/matchers";

declare module "@vitest/expect" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
