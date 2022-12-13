module.exports = {
  root: true,
  extends: [
    "airbnb-base",
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:jest/recommended",
    "plugin:jest/style",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    project: "./tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    // Nest specific rules
    "class-methods-use-this": "off",
    // Disallow the use of undeclared variables
    "no-undef": "error",
  },
  overrides: [
    {
      files: ["tests/**/*.ts", "src/**/*.spec.ts"],
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
