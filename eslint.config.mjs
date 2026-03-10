import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "client/dist/**",
      "server/dist/**",
      "shared/dist/**",
      ".eslintrc.cjs",
      "public/**",
      "src/**",
      "supabase/**",
      "index.html",
      "vite.config.js",
      "postcss.config.js",
      "tailwind.config.js",
      ".vscode/**"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["client/src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { "allowConstantExport": true }
      ]
    }
  },
  {
    files: ["server/src/**/*.ts", "shared/src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node
    }
  }
);
