#!/usr/bin/env node

const { spawnSync } = require("child_process");
const contracts = [
  "@ebsiint-sc/trusted-policies-registry",
  "@ebsiint-sc/trusted-issuers-registry",
  "@ebsiint-sc/trusted-ledgers-registry",
  "@ebsiint-sc/trusted-schemas-registry",
  "@ebsiint-sc/trusted-apps-registry",
  "@ebsiint-sc/did-registry",
  "@ebsiint-sc/timestamp",
  "@ebsiint-sc/bootstrap",
];
const { stdout } = spawnSync("sh", [
  "-c",
  `yarn nx print-affected --exclude=${contracts.join(",")} | sed '/^{/,/^}/!d'`,
]);

const { projects } = JSON.parse(stdout.toString());

const affected = projects.map((project) => {
  const [scope, packageName] = project.split("/");
  return packageName;
});

if (process.env.GIT_COMMIT) {
  const dockerTags = affected.map((pkg) => `${pkg}:${process.env.GIT_COMMIT}`);
  console.log("affected", dockerTags);
} else {
  console.log("affected", affected);
}
