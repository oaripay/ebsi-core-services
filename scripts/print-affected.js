#!/usr/bin/env node

const { EOL } = require("os");
const { spawnSync } = require("child_process");
const { writeFileSync } = require("fs");

// Not relevant/unnecessary
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
  `yarn nx print-affected --base=main~1 --head=main --exclude=${contracts.join(",")} | sed '/^{/,/^}/!d'`,
]);

const { projects } = JSON.parse(stdout.toString());

const affected = projects.map((project) => {
  const [scope, packageName] = project.split("/");
  return packageName;
});

const updates = affected
  .map((pkg) => `version_tag::${pkg}: ${process.env.GIT_COMMIT}`)
  .join(EOL);

writeFileSync("affected.yaml", updates);

console.log("affected.yaml created successfully");
console.log(updates);
