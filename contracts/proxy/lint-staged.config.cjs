module.exports = {
  "*.sol": ["prettier --write --plugin=prettier-plugin-solidity", "solhint"],
  "*.ts": () => "tsc -p tsconfig.json --noEmit --incremental false",
  "*.{js,ts}": ["eslint --fix"],
  "*.{md,json,yml,yaml}": ["prettier --write"],
};
