module.exports = {
  parser: "@typescript-eslint/parser",
  root: true,
  env: {
    browser: true,
    node: true,
  },
  extends: [
    "airbnb",
    "airbnb/hooks",
    "plugin:jest/all",
    "plugin:prettier/recommended",
    "prettier",
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    "react/jsx-filename-extension": 0,
    "import/prefer-default-export": 0,
    "no-await-in-loop": 0,
    "no-restricted-syntax": 0,
    "import/extensions": 0,
    "import/no-unresolved": 0,
    // All the below ignore rules have been added during monorepo migration and eslint deps version alignment.
    "no-unused-vars": 0,
    "react/jsx-no-useless-fragment": 0,
    "no-shadow": 0,
    "react/jsx-no-constructed-context-values": 0,
    "no-promise-executor-return": 0,
    "react/no-unstable-nested-components": 0,
  },
};
