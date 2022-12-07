#!/usr/bin/env node

const { EOL } = require("os");
const { spawnSync } = require("child_process");
const { writeFileSync } = require("fs");

const processResult = spawnSync("sh", [
  "-c",
  `yarn nx print-affected --base=main~1 --head=main | sed '/^{/,/^}/!d'`,
]);

try {
  const { projects } = JSON.parse(processResult.stdout.toString());
  const affected = projects
    .filter(
      (project) =>
        project.startsWith("@ebsiint-api") || project.startsWith("@ebsiint-app")
    )
    .map((project) => {
      const [scope, packageName] = project.split("/");
      return packageName;
    });

  if (affected.length === 0) {
    console.log(
      "No affected packages. No need for new docker images or deployments"
    );
    // Theory says exit with non-zero code to communicate an error.
    // The idea is that this scripts communicates an error to prevent jenkins deployment steps from executing in vain.
    return process.exit(1);
  }

  console.log("affected services", affected);

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
