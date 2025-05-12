#!/usr/bin/env node
import Mustache from "mustache";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env["DIDR_SC_V3_ADDRESS"]) {
  console.error("DIDR_SC_V3_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["DIDR_SC_V3_START_BLOCK"]) {
  console.error("DIDR_SC_V3_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  path.resolve(dirname, "../subgraph.template.yaml"),
).toString();

const contents = Mustache.render(source, {
  abi: fileURLToPath(
    import.meta.resolve("@ebsiint-sc/did-registry-v3/src/abi/DidRegistry.json"),
  ),
  address: process.env["DIDR_SC_V3_ADDRESS"] || "",
  startBlock: Number.parseInt(process.env["DIDR_SC_V3_START_BLOCK"] || "0", 10),
});

writeFileSync(path.resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
