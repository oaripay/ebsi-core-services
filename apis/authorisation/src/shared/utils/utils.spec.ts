import { getDockerTag } from "./index";

describe("Utilities", () => {
  describe("getDockerTag", () => {
    it("should return an empty string on unsupported environment", () => {
      const tag = getDockerTag("foo");
      expect(tag).toBe("");
    });
  });
});
