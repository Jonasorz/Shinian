import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

// eslint-plugin-react has not published ESLint 10 support yet. Next's React
// compiler and TypeScript checks still cover the application during builds.
const nextVitalsWithoutLegacyReactRules = nextVitals.map((config) => ({
  ...config,
  rules: Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(
      ([ruleName]) => !ruleName.startsWith("react/"),
    ),
  ),
}));

export default defineConfig([
  ...nextVitalsWithoutLegacyReactRules,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "node_modules/**",
    "coverage/**",
    "dist/**",
    "next-env.d.ts"
  ]),
]);
