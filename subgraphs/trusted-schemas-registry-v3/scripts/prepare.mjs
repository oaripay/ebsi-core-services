/* eslint-disable no-console */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Mustache from "mustache";

if (!process.env.TSR_SC_V3_ADDRESS) {
  console.error("TSR_SC_V3_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env.TSR_SC_V3_START_BLOCK) {
  console.error("TSR_SC_V3_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  resolve(dirname, "../subgraph.template.yaml"),
).toString();

const contents = Mustache.render(source, {
  address: process.env.TSR_SC_V3_ADDRESS || "",
  startBlock: parseInt(process.env.TSR_SC_V3_START_BLOCK || "0", 10),
  abi: import.meta
    .resolve(
      "@ebsiint-sc/trusted-schemas-registry-v3/src/abi/TrustedSchemasRegistry.json",
    )
    .replace("file://", ""),
});

writeFileSync(resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
