module.exports = {
  root: true,
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "prettier",
    "plugin:import/recommended",
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  ignorePatterns: ["coverage"],
  rules: {
    // we use it for scripts
    "no-console": "off",
    // we use it for tests
    "func-names": "off",
    "import/no-extraneous-dependencies": "off",
    "no-unused-expressions": "off",
    "import/extensions": "off",
    "no-shadow": "off",
    "@typescript-eslint/no-shadow": ["error"],
  },
};
