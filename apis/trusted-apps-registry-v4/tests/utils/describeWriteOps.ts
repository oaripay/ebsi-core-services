import { describe } from "@jest/globals";

export const describeWriteOps = () => {
  if (process.env.TEST_ENABLE_WRITE_OPS === "true") {
    return describe;
  }

  return describe.skip;
};

export default describeWriteOps;
