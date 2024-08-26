/**
 * ESLint config
 * @type {import("eslint").Linter.LegacyConfig}
 */
module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  rules: {
    // Error: https://github.com/import-js/eslint-plugin-import/issues/2890
    "import/no-cycle": "off",
  },
  overrides: [
    // Base config for TypeScript files
    {
      files: ["**/*.ts"],
      extends: [
        "airbnb-base",
        "airbnb-typescript/base",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic",
        "plugin:prettier/recommended",
      ],
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
      rules: {
        // Nest specific rules
        "class-methods-use-this": "off",
      },
    },
    // Extra config for tests files
    {
      files: ["tests/**/*.ts", "src/**/*.spec.ts"],
      extends: [
        "airbnb-base",
        "airbnb-typescript/base",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-type-checked",
        "plugin:@typescript-eslint/stylistic",
        "plugin:vitest/recommended",
        "plugin:prettier/recommended",
      ],
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: __dirname,
      },
      rules: {
        // Disable @typescript-eslint/no-unsafe-assignment in tests
        // Otherwise, it reports an "error" whenever we use an asymmetric matcher
        "@typescript-eslint/no-unsafe-assignment": ["off"],
      },
    },
    // Allow importing devDependencies in dev files
    {
      files: [
        "*.cjs",
        "**/*.d.ts",
        "tests/**/*.ts",
        "src/**/*.spec.ts",
        "vitest.config.ts",
        "vitest.config.e2e.ts",
      ],
      rules: {
        "import/no-extraneous-dependencies": [
          "error",
          {
            devDependencies: true,
            optionalDependencies: false,
            peerDependencies: false,
            bundledDependencies: false,
          },
        ],
      },
    },
  ],
};
