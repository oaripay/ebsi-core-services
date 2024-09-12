/* eslint-disable no-console */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Mustache from "mustache";

if (!process.env.TNT_SC_V2_ADDRESS) {
  console.error("TNT_SC_V2_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env.TNT_SC_V2_START_BLOCK) {
  console.error("TNT_SC_V2_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  resolve(dirname, "../subgraph.template.yaml"),
).toString();

const contents = Mustache.render(source, {
  address: process.env.TNT_SC_V2_ADDRESS || "",
  startBlock: parseInt(process.env.TNT_SC_V2_START_BLOCK || "0", 10),
  abi: import.meta
    .resolve("@ebsiint-sc/track-and-trace-v2/src/abi/TrackAndTrace.json")
    .replace("file://", ""),
});

writeFileSync(resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
