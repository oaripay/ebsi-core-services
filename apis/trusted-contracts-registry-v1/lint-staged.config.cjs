module.exports = {
  "*.ts": () => "tsc -p tsconfig.json --noEmit --incremental false",
  "*.{js,ts}": ["eslint --fix"],
  "*.{md,json,yml,yaml}": ["prettier --write"],
  "api/openapi.yaml": "spectral lint",
};
