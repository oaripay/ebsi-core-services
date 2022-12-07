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
  rules: {
    // we use it for scripts
    "no-console": "off",
    "func-names": "off",
    "import/no-extraneous-dependencies": "off",
    "no-unused-expressions": "off",
  },
};
