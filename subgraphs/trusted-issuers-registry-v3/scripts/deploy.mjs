#!/usr/bin/env node
import { $ } from "execa";
import { readFileSync } from "node:fs";
import path from "node:path";

const { dirname } = import.meta;

const { version } = JSON.parse(
  readFileSync(path.resolve(dirname, "../package.json")),
);

const graphBinary = path.resolve(dirname, "../node_modules/.bin/graph");

const $$ = $({ stdio: "inherit" }).sync;

$$`${graphBinary} codegen`;
$$`${graphBinary} build`;
$$`${graphBinary} create ebsi/trusted-issuers-registry-v3 --node ${process.env.NODE_URL}`;
$$`${graphBinary} deploy ebsi/trusted-issuers-registry-v3 --version-label ${version} --node ${process.env.NODE_URL} --ipfs ${process.env.IPFS_URL}`;
