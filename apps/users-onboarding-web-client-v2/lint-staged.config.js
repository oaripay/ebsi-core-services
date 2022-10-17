module.exports = {
  "*.{js,jsx,ts,tsx}": ["eslint --fix"],
  "*.{ts,tsx}": () => "tsc -p tsconfig.json --noEmit --incremental false",
  "*.{css}": ["stylelint --fix"],
  "*.{md,json,yml,yaml}": ["prettier --write"],
};
