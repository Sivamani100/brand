import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
    "public/workbox-*.js",
    "generate-icons.js",
    "scripts/**",
  ]),
  {
    // Extension 4: Code Quality rules
    rules: {
      // Discourage `any` — prefer explicit types
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused variables must be cleaned up (underscore prefix allowed)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Avoid array index as key — use stable IDs
      "react/no-array-index-key": "warn",
      // No bare console.log — allow warn/error for production error paths
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Disable strict React Compiler rules that block build
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
]);

export default eslintConfig;
