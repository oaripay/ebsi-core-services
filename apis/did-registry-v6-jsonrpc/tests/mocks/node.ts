// src/mocks/node.js
import { setupServer } from "msw/node";

import { handlers } from "./handlers.ts";

export const graphServer = setupServer(...handlers);

export default graphServer;
