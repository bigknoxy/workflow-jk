import { FlatConfig } from "eslint";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Base JavaScript recommended rules
  js.configs.recommended,
  
  // TypeScript-specific configuration
  ...tseslint.configs.recommended,
  
  // Ignore patterns
  {
    ignores: [
      "dist/",
      "node_modules/",
      ".turbo/",
      ".next/",
      "*.tsbuildinfo",
      "coverage/",
      "*.d.ts",
      "*.d.mts",
    ],
  },
  
  // TypeScript files with enhanced rules
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      // TypeScript-specific rules - use warnings for better DX
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "off", // Allow any for flexibility
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      
      // General TypeScript rules
      "no-unused-vars": "off", // Handled by TS version
      "@typescript-eslint/no-shadow": "off",
      "no-shadow": "off",
      
      // Best practices
      "no-console": "off",
      "prefer-const": "off",
      "no-var": "off",
      
      // Code quality
      "eqeqeq": "off",
      "no-multi-assign": "off",
    },
  },
  
  // Test files
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  
  // Configuration files
  {
    files: ["eslint.config.*", ".eslintrc*", "*.config.ts", "*.config.js", "*.config.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  
  // Migration/script files
  {
    files: ["scripts/**/*", "tools/**/*"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
) satisfies FlatConfig[];