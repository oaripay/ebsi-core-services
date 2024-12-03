module.exports = {
  "**/openapi.yaml": "spectral lint",
  "*.sol": ["solhint"],
  "*.ts": () => "tsc -p tsconfig.json --noEmit --incremental false",
  "*.{js,ts}": ["eslint --fix"],
  "*.{md,json,yml,yaml}": ["prettier --write"],
};
