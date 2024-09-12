/* eslint-disable no-console */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Mustache from "mustache";

if (!process.env.DIDR_SC_V4_ADDRESS) {
  console.error("DIDR_SC_V4_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env.DIDR_SC_V4_START_BLOCK) {
  console.error("DIDR_SC_V4_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  resolve(dirname, "../subgraph.template.yaml"),
).toString();

const contents = Mustache.render(source, {
  address: process.env.DIDR_SC_V4_ADDRESS || "",
  startBlock: parseInt(process.env.DIDR_SC_V4_START_BLOCK || "0", 10),
  abi: import.meta
    .resolve("@ebsiint-sc/did-registry-v4/src/abi/DidRegistry.json")
    .replace("file://", ""),
});

writeFileSync(resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
