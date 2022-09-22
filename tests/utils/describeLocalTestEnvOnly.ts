export const describeLocalTestEnvOnly = () => {
  if (process.env.TEST_ENV !== "remote") {
    return describe;
  }

  return describe.skip;
};

export default describeLocalTestEnvOnly;
