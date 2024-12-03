#!/usr/bin/env node
import Mustache from "mustache";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

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
  path.resolve(dirname, "../subgraph.template.yaml"),
).toString();

const contents = Mustache.render(source, {
  abi: import.meta
    .resolve("@ebsiint-sc/did-registry-v4/src/abi/DidRegistry.json")
    .replace("file://", ""),
  address: process.env.DIDR_SC_V4_ADDRESS || "",
  startBlock: Number.parseInt(process.env.DIDR_SC_V4_START_BLOCK || "0", 10),
});

writeFileSync(path.resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
