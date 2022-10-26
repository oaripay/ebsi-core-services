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

const processResult = spawnSync("sh", [
  "-c",
  `yarn nx print-affected --exclude=${contracts.join(",")} | sed '/^{/,/^}/!d'`,
]);

try {
  const { projects } = JSON.parse(processResult.stdout.toString());
  const affected = projects.map((project) => {
    const [scope, packageName] = project.split("/");
    return packageName;
  });

  console.log("affected packages", affected);

  const updates = affected
    .map((pkg) => `version_tag::${pkg}: ${process.env.GIT_COMMIT}`)
    .join(EOL);

  writeFileSync("affected.yaml", updates);

  console.log("affected.yaml created successfully");
  console.log(updates);
} catch (error) {
  console.error("Could not parse results", error.message);
  console.log("The process result", processResult);
}
