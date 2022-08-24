module.exports = {
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
  },
};
