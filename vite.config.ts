// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Public connector configuration is mapped to the app's stable analytics env names.
const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "VITE_");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_POSTHOG_KEY": JSON.stringify(env.VITE_POSTHOG_KEY ?? env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY ?? ""),
      "import.meta.env.VITE_POSTHOG_HOST": JSON.stringify(env.VITE_POSTHOG_HOST ?? (env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com")),
    },
    // Pre-bundle shared UI deps up front: late discovery re-optimizes mid-session and can
    // load two React copies ("Cannot read properties of null (reading 'useContext')").
    optimizeDeps: { include: ["lucide-react", "clsx", "tailwind-merge"] },
    // Coverage reports are written into the project; don't reload the preview for them.
    server: { watch: { ignored: ["**/coverage/**"] } },
  },
});
