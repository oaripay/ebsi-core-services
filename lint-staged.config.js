module.exports = {
  "api/openapi.yaml": "spectral lint api/openapi.yaml",
  "*.{js,ts}": ["eslint --fix"],
  "*.ts": () => "tsc -p tsconfig.json --noEmit --incremental false",
  "*.{md,json,yml,yaml}": ["prettier --write"],
};
