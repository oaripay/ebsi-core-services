module.exports = {
  "*.{js,ts}": ["eslint --fix"],
  "*.ts": () => "tsc -p tsconfig.json --noEmit --incremental false",
  "*.{md,json,yml,yaml,sol}": ["prettier --write"],
  "*.sol": ["solhint"],
};
