module.exports = {
  root: true,
  extends: [
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
    "plugin:jest/recommended",
    "plugin:jest/style",
    "prettier/@typescript-eslint",
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
  },
};
