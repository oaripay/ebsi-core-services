/* eslint-disable no-unused-expressions */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { $ } from "execa";

const { dirname } = import.meta;

const { version } = JSON.parse(
  readFileSync(resolve(dirname, "../package.json")),
);

const graphBinary = resolve(dirname, "../node_modules/.bin/graph");

const $$ = $({ stdio: "inherit" }).sync;

$$`${graphBinary} codegen`;
$$`${graphBinary} build`;
$$`${graphBinary} create ebsi/trusted-schemas-registry-v3 --node ${process.env.NODE_URL}`;
$$`${graphBinary} deploy ebsi/trusted-schemas-registry-v3 --version-label ${version} --node ${process.env.NODE_URL} --ipfs ${process.env.IPFS_URL}`;
