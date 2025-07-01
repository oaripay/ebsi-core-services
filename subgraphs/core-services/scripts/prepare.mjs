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

if (!process.env["TIMESTAMP_SC_V2_ADDRESS"]) {
  console.error("TIMESTAMP_SC_V2_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TIMESTAMP_SC_V2_START_BLOCK"]) {
  console.error("TIMESTAMP_SC_V2_START_BLOCK must be defined");
  process.exit(1);
}

if (!process.env["TNT_SC_V1_ADDRESS"]) {
  console.error("TNT_SC_V1_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TNT_SC_V1_START_BLOCK"]) {
  console.error("TNT_SC_V1_START_BLOCK must be defined");
  process.exit(1);
}

if (!process.env["TIR_SC_V3_ADDRESS"]) {
  console.error("TIR_SC_V3_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TIR_SC_V3_START_BLOCK"]) {
  console.error("TIR_SC_V3_START_BLOCK must be defined");
  process.exit(1);
}

if (!process.env["TPR_SC_V2_ADDRESS"]) {
  console.error("TPR_SC_V2_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TPR_SC_V2_START_BLOCK"]) {
  console.error("TPR_SC_V2_START_BLOCK must be defined");
  process.exit(1);
}

if (!process.env["TSR_SC_V2_ADDRESS"]) {
  console.error("TSR_SC_V2_ADDRESS must be defined");
  process.exit(1);
}

if (!process.env["TSR_SC_V2_START_BLOCK"]) {
  console.error("TSR_SC_V2_START_BLOCK must be defined");
  process.exit(1);
}

const { dirname } = import.meta;

const source = readFileSync(
  path.resolve(dirname, "../subgraph.template.yaml"),
).toString();

// Patch TIR SC ABI, add old event name with the typo that was fixed in commit a060911fc59a19ef664ac9da08ccff8e07c78885
// This is required in order to index all the data on testnet
const trustedIssuersRegistryAbi = JSON.parse(
  readFileSync(
    fileURLToPath(
      import.meta.resolve(
        "@ebsiint-sc/trusted-issuers-registry-v3/src/abi/Tir.json",
      ),
    ),
  ).toString(),
);

// @ts-expect-error "abi" type is not properly defined
trustedIssuersRegistryAbi.push({
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
  JSON.stringify(trustedIssuersRegistryAbi, undefined, 2),
  {},
);

const contents = Mustache.render(source, {
  // DID Registry SC v3
  didRegistryAbi: fileURLToPath(
    import.meta.resolve("@ebsiint-sc/did-registry-v3/src/abi/DidRegistry.json"),
  ),
  didRegistryAddress: process.env["DIDR_SC_V3_ADDRESS"],
  didRegistryStartBlock: Number.parseInt(
    process.env["DIDR_SC_V3_START_BLOCK"],
    10,
  ),
  // Timestamp SC v2
  timestampAbi: fileURLToPath(
    import.meta.resolve("@ebsiint-sc/timestamp-v2/src/abi/Timestamp.json"),
  ),
  timestampAddress: process.env["TIMESTAMP_SC_V2_ADDRESS"],
  timestampStartBlock: Number.parseInt(
    process.env["TIMESTAMP_SC_V2_START_BLOCK"],
    10,
  ),
  trackAndTraceAbi: fileURLToPath(
    import.meta.resolve(
      "@ebsiint-sc/track-and-trace/src/abi/TrackAndTrace.json",
    ),
  ),
  trackAndTraceAddress: process.env["TNT_SC_V1_ADDRESS"],
  trackAndTraceStartBlock: Number.parseInt(
    process.env["TNT_SC_V1_START_BLOCK"],
    10,
  ),
  trustedIssuersRegistryAbi: path.resolve(dirname, "../node_modules/Tir.json"),
  trustedIssuersRegistryAddress: process.env["TIR_SC_V3_ADDRESS"],
  trustedIssuersRegistryStartBlock: Number.parseInt(
    process.env["TIR_SC_V3_START_BLOCK"],
    10,
  ),
  trustedPoliciesRegistryAbi: fileURLToPath(
    import.meta.resolve(
      "@ebsiint-sc/trusted-policies-registry-v2/src/abi/PolicyRegistry.json",
    ),
  ),
  trustedPoliciesRegistryAddress: process.env["TPR_SC_V2_ADDRESS"],
  trustedPoliciesRegistryStartBlock: Number.parseInt(
    process.env["TPR_SC_V2_START_BLOCK"],
    10,
  ),
  trustedSchemasRegistryAbi: fileURLToPath(
    import.meta.resolve(
      "@ebsiint-sc/trusted-schemas-registry-v2/src/abi/SchemaSCRegistry.json",
    ),
  ),
  trustedSchemasRegistryAddress: process.env["TSR_SC_V2_ADDRESS"],
  trustedSchemasRegistryStartBlock: Number.parseInt(
    process.env["TSR_SC_V2_START_BLOCK"],
    10,
  ),
});

writeFileSync(path.resolve(dirname, "../subgraph.yaml"), contents);

console.log("subgraph.yaml generated successfully!");
