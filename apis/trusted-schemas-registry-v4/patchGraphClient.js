/**
 * The file .graphclientrc.yml is used to generate the code to
 * interact with the client and it's necessary to define the endpoint
 * in this yaml. However, we want to provide the endpoint during runtime
 * by passing an env variable.
 *
 * The solution we found for this was to update the generated code
 * and import the env variable there.
 *
 * This script makes 2 changes in the generated code for the graph client:
 * 1. import dotenv
 * 2. update the "endpoint" to take it from process.env.GRAPHQL_ENDPOINT
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const indexGraphClient = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  ".graphclient/index.js",
);
let data = fs.readFileSync(indexGraphClient, "utf8");
data = `import 'dotenv/config';\n${data}`;
data = data.replace(
  `"{context.myCustomEndpoint}"`,
  "process.env.GRAPHQL_ENDPOINT",
);
fs.writeFileSync(indexGraphClient, data);
