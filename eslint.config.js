import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      ".output",
      ".vinxi",
      "coverage",
      "src/routeTree.gen.ts",
      "src/integrations/supabase/auth-attacher.ts",
      "src/integrations/supabase/auth-middleware.ts",
      "src/integrations/supabase/client.server.ts",
      "src/integrations/supabase/client.ts",
      "src/integrations/supabase/cron-auth.ts",
      "src/integrations/supabase/previewAuthStorage.ts",
      "src/integrations/supabase/types.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Accessibility rules for our own components, routes and lib; generated
    // ui/ primitives stay on the base config unless a real problem appears.
    files: [
      "src/components/site/**/*.{ts,tsx}",
      "src/routes/**/*.{ts,tsx}",
      "src/lib/**/*.{ts,tsx}",
    ],
    plugins: { "jsx-a11y": jsxA11y },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Alt copy like "Photo shared by {handle}" is mandated wording, and the
      // plugin always flags "photo" (custom words merge with its defaults).
      "jsx-a11y/img-redundant-alt": "off",
    },
  },
  eslintPluginPrettier,
);
