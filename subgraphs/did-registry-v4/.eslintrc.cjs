const path = require("path");

module.exports = {
  root: true,
  extends: ["airbnb-base", "plugin:prettier/recommended"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
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
    },
    // Allow importing devDependencies in dev files
    {
      files: ["*.cjs", "*.mjs"],
      rules: {
        "import/no-extraneous-dependencies": [
          "error",
          {
            devDependencies: true,
            optionalDependencies: false,
            peerDependencies: false,
            bundledDependencies: false,
            packageDir: [
              path.join(__dirname, "."),
              path.join(__dirname, "../.."), // Load dev dependencies from workspace
            ],
          },
        ],
      },
    },
    // AssemblyScript files
    {
      files: ["tests/**/*.ts", "src/**/*.ts"],
      rules: {
        // No destructuring in AssemblyScript
        "prefer-destructuring": "off",

        // Different behavior in AssemblyScript.
        // Remove rule when AssemblyScript version >= 0.20 in graph-tooling
        // https://github.com/graphprotocol/graph-tooling/issues/1187
        eqeqeq: "off",
      },
    },
  ],
};
