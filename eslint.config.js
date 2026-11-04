import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["src/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.browser },
  },
  {
    files: ["*.config.js", "build/**/*.js", "api/**/*.js", "scripts/**/*.{js,mjs}", "src/data/**/*.js", "tests/**/*.js"],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: globals.node },
  },
  {
    // The screenshot and e2e tools run code inside the browser page (page.evaluate) as well.
    files: ["scripts/shot.mjs", "scripts/e2e.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      eqeqeq: ["warn", "always"],
      curly: ["warn", "all"],
    },
  },
];
