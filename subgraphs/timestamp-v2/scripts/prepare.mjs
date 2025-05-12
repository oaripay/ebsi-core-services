#!/usr/bin/env node
import Mustache from "mustache";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env["TIMESTAMP_SC_V2_ADDRESS"]) {
  console.error("TIMESTAMP_SC_V2_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TIMESTAMP_SC_V2_START_BLOCK"]) {
  console.error("TIMESTAMP_SC_V2_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  path.resolve(dirname, "../subgraph.template.yaml"),
).toString();

const contents = Mustache.render(source, {
  abi: fileURLToPath(
    import.meta.resolve("@ebsiint-sc/timestamp-v2/src/abi/Timestamp.json"),
  ),
  address: process.env["TIMESTAMP_SC_V2_ADDRESS"] || "",
  startBlock: Number.parseInt(
    process.env["TIMESTAMP_SC_V2_START_BLOCK"] || "0",
    10,
  ),
});

writeFileSync(path.resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
