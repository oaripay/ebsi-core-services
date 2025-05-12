#!/usr/bin/env node
import Mustache from "mustache";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env["TIR_SC_V3_ADDRESS"]) {
  console.error("TIR_SC_V3_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TIR_SC_V3_START_BLOCK"]) {
  console.error("TIR_SC_V3_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  path.resolve(dirname, "../subgraph.template.yaml"),
).toString();

const abi = JSON.parse(
  readFileSync(
    fileURLToPath(
      import.meta.resolve(
        "@ebsiint-sc/trusted-issuers-registry-v3/src/abi/Tir.json",
      ),
    ),
  ).toString(),
);

// Patch ABI, add old event name with the typo that was fixed in commit a060911fc59a19ef664ac9da08ccff8e07c78885
// This is required in order to index all the data on testnet
// @ts-expect-error "abi" type is not properly defined
abi.push({
  anonymous: false,
  inputs: [
    {
      indexed: false,
      internalType: "string",
      name: "did",
      type: "string",
    },
    {
      indexed: true,
      internalType: "bytes32",
      name: "attributeId",
      type: "bytes32",
    },
    {
      indexed: true,
      internalType: "bytes32",
      name: "revisionId",
      type: "bytes32",
    },
    {
      indexed: false,
      internalType: "enum IssuerStorage.IssuerType",
      name: "issuerType",
      type: "uint8",
    },
  ],
  name: "AddAtrributeRevision", // Old event name
  type: "event",
});

writeFileSync(
  path.resolve(dirname, "../node_modules/Tir.json"),
  JSON.stringify(abi, undefined, 2),
  {},
);

const contents = Mustache.render(source, {
  abi: path.resolve(dirname, "../node_modules/Tir.json"),
  address: process.env["TIR_SC_V3_ADDRESS"] || "",
  startBlock: Number.parseInt(process.env["TIR_SC_V3_START_BLOCK"] || "0", 10),
});

writeFileSync(path.resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
