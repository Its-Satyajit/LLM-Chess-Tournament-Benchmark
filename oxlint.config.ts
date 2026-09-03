
// AI AGENTS: DO NOT MODIFY THIS FILE.
//
// This configuration is intentionally strict.
// Do not add, remove, weaken, downgrade, disable, or bypass rules.
// Do not change category severity from "error".
// If lint fails, fix the source code instead of weakening this configuration.
// Changes to this file require explicit human approval.

import { defineConfig } from "oxlint";

export default defineConfig({
  // Keep the baseline broad. Explicit plugins are required because
  // specifying `plugins` replaces Oxlint's default plugin set.
  plugins: [
    "oxc",
    "typescript",
    "react",
    "react-perf",
    "nextjs",
    "import",
    "promise",
    "jsx-a11y",
    "unicorn",
  ],

  ignorePatterns: [
    // AI / agent working directories
    "*.agent/**",
    "*.agents/**",
    "*.claude/**",
    "*.codex/**",
    "*.continue/**",
    "*.cursor/**",
    "*.gemini/**",
    "*.opencode/**",
    "*.pi/**",
    "*.roo/**",
    "*.windsurf/**",

    // Linter implementation itself
    "tools/oxlint/anti-slop/**",

    // Dependencies / generated output
    "**/node_modules/**",
    "**/dist/**",
    "**/bindings/**",

    // Vendored third-party import-test fixtures and spec sources.
    "internal/importer/testdata/**",

    // Design-experiment scratch area.
    "ui-demos/**",
  ],

  jsPlugins: [
    {
      name: "anti-slop",
      specifier: "./tools/oxlint/anti-slop/index.ts",
    },
  ],



  rules: {
    // ================================================================
    // Core correctness
    // ================================================================

    "no-debugger": "error",
    "no-duplicate-case": "error",
    "no-duplicate-imports": "error",
    "no-fallthrough": "error",
    "no-invalid-regexp": "error",
    "no-irregular-whitespace": "error",
    "no-new-native-nonconstructor": "error",
    "no-obj-calls": "error",
    "no-self-assign": "error",
    "no-self-compare": "error",
    "no-sparse-arrays": "error",
    "no-unexpected-multiline": "error",
    "no-unreachable": "error",
    "no-unreachable-loop": "error",
    "no-unsafe-finally": "error",
    "no-unsafe-negation": "error",
    "no-unsafe-optional-chaining": "error",
    "use-isnan": "error",
    "valid-typeof": "error",

    // ================================================================
    // TypeScript
    // ================================================================

    "typescript/no-array-delete": "error",
    "typescript/no-base-to-string": "error",
    "typescript/no-duplicate-enum-values": "error",
    "typescript/no-duplicate-type-constituents": "error",
    "typescript/no-dynamic-delete": "error",
    "typescript/no-empty-object-type": "error",
    "typescript/no-extra-non-null-assertion": "error",
    "typescript/no-invalid-void-type": "error",
    "typescript/no-misused-new": "error",
    "typescript/no-namespace": "error",
    "typescript/no-non-null-asserted-nullish-coalescing": "error",
    "typescript/no-non-null-asserted-optional-chain": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/no-this-alias": "error",
    "typescript/no-unnecessary-type-arguments": "error",
    "typescript/no-unnecessary-type-constraint": "error",
    "typescript/no-unsafe-declaration-merging": "error",
    "typescript/no-useless-empty-export": "error",

    // ================================================================
    // React correctness
    // ================================================================

    "react/jsx-key": "error",
    "react/jsx-no-duplicate-props": "error",
    "react/jsx-no-target-blank": "error",
    "react/no-children-prop": "error",
    "react/no-danger-with-children": "error",

    "react/no-direct-mutation-state": "error",
    "react/no-find-dom-node": "error",
    "react/no-is-mounted": "error",
    "react/no-render-return-value": "error",
    "react/no-string-refs": "error",
    "react/no-unescaped-entities": "error",
    "react/no-unknown-property": "error",
    "react/no-unstable-nested-components": "error",
    "react/only-export-components": "error",

    // React Compiler correctness rules.
    // These analyze components/hooks for patterns that break
    // compiler assumptions or prevent safe optimization.
    "react/globals": "error",
    "react/purity": "error",
    "react/refs": "error",
    "react/set-state-in-effect": "error",
    "react/set-state-in-render": "error",
    "react/static-components": "error",
    "react/syntax": "error",
    "react/unsupported-syntax": "error",
    "react/use-memo": "error",

    // ================================================================
    // React performance
    // ================================================================

    "react-perf/jsx-no-new-array-as-prop": "error",
    "react-perf/jsx-no-new-function-as-prop": "error",
    "react-perf/jsx-no-new-object-as-prop": "error",

    // ================================================================
    // Next.js
    // ================================================================

    "nextjs/google-font-display": "error",
    "nextjs/google-font-preconnect": "error",
    "nextjs/inline-script-id": "error",
    "nextjs/next-script-for-ga": "error",
    "nextjs/no-assign-module-variable": "error",
    "nextjs/no-async-client-component": "error",
    "nextjs/no-before-interactive-script-outside-document": "error",
    "nextjs/no-css-tags": "error",
    "nextjs/no-document-import-in-page": "error",
    "nextjs/no-duplicate-head": "error",
    "nextjs/no-head-element": "error",
    "nextjs/no-head-import-in-document": "error",
    "nextjs/no-html-link-for-pages": "error",
    "nextjs/no-img-element": "error",
    "nextjs/no-page-custom-font": "error",
    "nextjs/no-script-component-in-head": "error",
    "nextjs/no-styled-jsx-in-document": "error",
    "nextjs/no-sync-scripts": "error",
    "nextjs/no-title-in-document-head": "error",
    "nextjs/no-unwanted-polyfillio": "error",
    "nextjs/no-typos": "error",

    // ================================================================
    // Imports / module architecture
    // ================================================================

    "import/no-absolute-path": "error",
    "import/no-duplicates": "error",
    "import/no-named-default": "error",
    "import/no-self-import": "error",
    "import/no-webpack-loader-syntax": "error",
    "import/no-named-as-default": "error",
    "import/no-named-as-default-member": "error",

    // Cycles are particularly painful in Next.js because of the
    // server/client module graph.
    "import/no-cycle": "error",

    // ================================================================
    // Promise correctness
    // ================================================================

    "promise/param-names": "error",
    "promise/no-return-in-finally": "error",
    "promise/no-return-wrap": "error",
    "promise/valid-params": "error",

    // ================================================================
    // Accessibility
    // ================================================================

    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-has-content": "error",
    "jsx-a11y/aria-props": "error",
    "jsx-a11y/aria-role": "error",
    "jsx-a11y/aria-unsupported-elements": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/html-has-lang": "error",
    "jsx-a11y/iframe-has-title": "error",
    "jsx-a11y/no-access-key": "error",
    "jsx-a11y/no-autofocus": "error",
    "jsx-a11y/no-distracting-elements": "error",
    "jsx-a11y/no-noninteractive-element-interactions": "error",
    "jsx-a11y/no-redundant-roles": "error",
    "jsx-a11y/role-has-required-aria-props": "error",
    "jsx-a11y/role-supports-aria-props": "error",
    "jsx-a11y/scope": "error",

    // ================================================================
    // Unicorn / modern JavaScript
    // ================================================================

    "unicorn/error-message": "error",
    "unicorn/new-for-builtins": "error",
    "unicorn/no-array-for-each": "error",

    "unicorn/no-instanceof-builtins": "error",
    "unicorn/no-invalid-fetch-options": "error",
    "unicorn/no-new-array": "error",
    "unicorn/no-new-buffer": "error",
    "unicorn/no-static-only-class": "error",
    "unicorn/no-typeof-undefined": "error",
    "unicorn/no-useless-undefined": "error",
    "unicorn/prefer-array-find": "error",
    "unicorn/prefer-array-flat": "error",
    "unicorn/prefer-array-index-of": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/prefer-modern-dom-apis": "error",
    "unicorn/prefer-number-properties": "error",
    "unicorn/prefer-optional-catch-binding": "error",
    "unicorn/prefer-string-replace-all": "error",
    "unicorn/prefer-string-slice": "error",
    "unicorn/prefer-structured-clone": "error",
    "unicorn/prefer-type-error": "error",

    // ================================================================
    // Oxc-specific correctness
    // ================================================================

    "oxc/no-barrel-file": "error",
    "oxc/no-const-enum": "error",

    // ================================================================
    // Project anti-slop policy
    // ================================================================
    //
    // These are intentionally NOT relaxed. They represent project
    // architectural and typing policy rather than generic lint style.

    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-widen-then-assert": "error",

    // Boundary parsing uses typeGuards.ts (isRecord/isString) +
    // explicit domain types.
    //
    // Every remaining `as ` assertion requires:
    //   // SAFETY:
    // See frontend/src/lib/typeGuards.ts.
    "anti-slop/no-runtime-typeof": [
      "error",
      {
        allowInTypeGuards: true,
      },
    ],

    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error",
  },

  overrides: [
    {
      // Tests legitimately need some patterns that are inappropriate
      // in production application code.
      files: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.spec.ts",
        "**/*.spec.tsx",
      ],

      rules: {
        // Intentionally empty for now.
        //
        // Do not weaken production rules here unless a test-specific
        // false positive is demonstrated and explicitly approved.
      },
    },

    {
      // Server-only code can safely use Node APIs.
      files: [
        "**/*.server.ts",
        "**/*.server.tsx",
        "**/server/**",
        "**/app/api/**",
      ],

      plugins: [
        "oxc",
        "typescript",
        "react",
        "react-perf",
        "nextjs",
        "import",
        "promise",
        "jsx-a11y",
        "unicorn",
        "node",
      ],
    },
  ],
});
