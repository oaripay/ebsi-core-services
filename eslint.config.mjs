import js from "@eslint/js";
// @ts-expect-error eslint-plugin-import doesn't ship types. See https://github.com/import-js/eslint-plugin-import/issues/3090
import importPlugin from "eslint-plugin-import";
import perfectionist from "eslint-plugin-perfectionist";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import regexpPlugin from "eslint-plugin-regexp";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import vitest from "eslint-plugin-vitest";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      // Global
      ".nx",
      "**/coverage",
      "**/dist",
      // APIs
      "apis/*/.graphclient",
      // Smart contracts
      "contracts/*/artifacts",
      "contracts/*/cache",
      "contracts/*/src",
      // Subgraphs
      "subgraphs/*/generated",
      // e2e tests
      "tests/data",
    ],
  },

  // Extends
  js.configs.recommended,
  // eslint-disable-next-line import/no-named-as-default-member
  tseslint.configs.recommendedTypeChecked,
  // eslint-disable-next-line import/no-named-as-default-member
  tseslint.configs.stylisticTypeChecked,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  importPlugin.flatConfigs.recommended,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
  importPlugin.flatConfigs.typescript,
  eslintPluginUnicorn.configs["flat/recommended"],
  regexpPlugin.configs["flat/recommended"],
  perfectionist.configs["recommended-natural"],

  // Global config
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          ignoreRestSiblings: true,
          varsIgnorePattern: "^_",
        },
      ],
      // TODO: remove following rules?
      "unicorn/filename-case": "off",
      "unicorn/no-array-reduce": "off",
      "unicorn/prevent-abbreviations": "off",
    },
    settings: {
      "import/resolver": {
        // See also https://github.com/import-js/eslint-import-resolver-typescript#configuration
        node: true,
        typescript: true,
      },
    },
  },

  // CommonJS files
  {
    // eslint-disable-next-line import/no-named-as-default-member
    extends: [tseslint.configs.disableTypeChecked],
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "unicorn/prefer-module": "off",
    },
  },

  // Scripts (ESM)
  {
    // eslint-disable-next-line import/no-named-as-default-member
    extends: [tseslint.configs.disableTypeChecked],
    files: ["scripts/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "module",
    },
  },

  //////////
  // APIS //
  //////////

  // DTOs
  {
    files: ["apis/**/*.dto.ts"],
    rules: {
      // Don't change the order of class members and decorators in DTOs
      "perfectionist/sort-classes": ["off"],
      "perfectionist/sort-decorators": ["off"],
    },
  },

  // Test files
  {
    files: ["apis/*/tests/**/*.ts", "apis/*/src/**/*.spec.ts"],
    ...vitest.configs.recommended,
    rules: {
      // Disable @typescript-eslint/no-unsafe-assignment in tests
      // Otherwise, it reports an "error" whenever we use an asymmetric matcher
      "@typescript-eslint/no-unsafe-assignment": "off",
      // Make sure to import hardhat first
      "perfectionist/sort-imports": [
        "error",
        {
          customGroups: {
            type: { hardhat: "^hardhat(?:/.*)?$" },
            value: { hardhat: "^hardhat(?:/.*)?$" },
          },
          groups: [
            "hardhat",
            "type",
            ["builtin", "external"],
            "internal-type",
            "internal",
            ["parent-type", "sibling-type", "index-type"],
            ["parent", "sibling", "index"],
            "object",
            "unknown",
          ],
        },
      ],
    },
  },

  // k6 test files
  {
    // eslint-disable-next-line import/no-named-as-default-member
    extends: [tseslint.configs.disableTypeChecked],
    files: ["apis/*/tests/k6/**/*.js"],
    languageOptions: {
      globals: { __ENV: true },
    },
    rules: {
      "import/no-unresolved": ["error", { ignore: ["^k6"] }],
    },
  },

  ///////////////
  // Contracts //
  ///////////////
  {
    files: ["contracts/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
    },
    rules: {
      // Make sure to import hardhat first
      "perfectionist/sort-imports": [
        "error",
        {
          customGroups: {
            type: { hardhat: "^hardhat(?:/.*)?$" },
            value: { hardhat: "^hardhat(?:/.*)?$" },
          },
          groups: [
            "hardhat",
            "type",
            ["builtin", "external"],
            "internal-type",
            "internal",
            ["parent-type", "sibling-type", "index-type"],
            ["parent", "sibling", "index"],
            "object",
            "unknown",
          ],
        },
      ],
      "unicorn/no-await-expression-member": "off",
      "unicorn/prefer-module": "off",
    },
  },

  // Scripts and tasks
  {
    files: ["contracts/*/scripts/**/*.ts", "contracts/*/tasks/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "commonjs",
    },
    rules: {
      "unicorn/no-process-exit": "off",
      "unicorn/prefer-top-level-await": "off",
    },
  },

  ///////////////
  // Subgraphs //
  ///////////////

  // Scripts
  {
    // eslint-disable-next-line import/no-named-as-default-member
    extends: [tseslint.configs.disableTypeChecked],
    files: ["subgraphs/*/scripts/*.mjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": [
        "error",
        {
          // Enable to use tagged template literals with execa
          allowTaggedTemplates: true,
        },
      ],
    },
  },
  // Allow importing devDependencies in dev files
  {
    files: ["subgraphs/*/*.cjs", "subgraphs/*/*.mjs"],
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          bundledDependencies: false,
          devDependencies: true,
          optionalDependencies: false,
          peerDependencies: false,
          // TODO
          /*
          packageDir: [
            path.join(__dirname, "."),
            path.join(__dirname, "../.."), // Load dev dependencies from workspace
          ],
          */
        },
      ],
    },
  },
  // AssemblyScript files
  {
    files: ["subgraphs/*/tests/**/*.ts", "subgraphs/*/src/**/*.ts"],
    rules: {
      // Disable for of loop
      "@typescript-eslint/prefer-for-of": "off",

      // Different behavior in AssemblyScript.
      // Remove rule when AssemblyScript version >= 0.20 in graph-tooling
      // https://github.com/graphprotocol/graph-tooling/issues/1187
      eqeqeq: "off",

      // No destructuring in AssemblyScript
      "prefer-destructuring": "off",

      // Allow calling `Array#push()` multiple times
      "unicorn/no-array-push-push": "off",

      // Disable for of loop
      "unicorn/no-for-loop": "off",
      // Use ternary instead of logical operators
      "unicorn/prefer-logical-operator-over-ternary": "off",
    },
  },

  // Prettier plugin (always last)
  eslintPluginPrettierRecommended,
);
