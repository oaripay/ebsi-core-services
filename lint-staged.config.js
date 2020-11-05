module.exports = {
  "*.{js,ts}": ["eslint --fix"],
  "*.{md,json,yml,yaml,sol}": ["prettier --write"],
  "*.sol": ["solhint"],
};
