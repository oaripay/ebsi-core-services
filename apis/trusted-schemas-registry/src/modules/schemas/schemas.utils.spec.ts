import { describe, expect, it } from "vitest";

import { range } from "./schemas.utils.js";

describe("range", () => {
  it("should return the expected ranges", () => {
    expect.assertions(2);
    expect(range(0, 4)).toStrictEqual([0, 1, 2, 3, 4]);
    expect(range(7, 9)).toStrictEqual([7, 8, 9]);
  });
});
