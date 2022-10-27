module.exports = {
  root: true,
  extends: [
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:import/recommended",
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: ["**/contracts", "**/src/types", "schemas"],
  rules: {
    // we use it for scripts
    "no-console": "off",
    // we use it for tests
    "import/no-extraneous-dependencies": "off",
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/ban-ts-comment": "off",
  },
};
