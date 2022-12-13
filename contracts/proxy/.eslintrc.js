module.exports = {
  root: true,
  extends: [
    "airbnb-base",
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
    "no-console": "off",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: true,
        optionalDependencies: false,
        peerDependencies: false,
        bundledDependencies: false,
      },
    ],
    "@typescript-eslint/no-var-requires": "off",
    // Disallow the use of undeclared variables
    "no-undef": "error",
  },
  globals: {
    // Disable Jest globals
    afterAll: "off",
    afterEach: "off",
    beforeAll: "off",
    beforeEach: "off",
    describe: "off",
    expect: "off",
    fit: "off",
    it: "off",
    jest: "off",
    test: "off",
    xdescribe: "off",
    xit: "off",
    xtest: "off",
  },
};
