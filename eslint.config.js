import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/", "**/node_modules/", "**/*.md"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // intense rules get added as the codebase grows; keep foundations readable
      "@typescript-eslint/no-unused-expressions": "error",
      eqeqeq: "error",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
