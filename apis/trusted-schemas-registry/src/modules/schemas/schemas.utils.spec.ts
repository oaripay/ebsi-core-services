import { describe, it, expect } from "@jest/globals";
import { range } from "./schemas.utils";

describe("range", () => {
  it("should return the expected ranges", () => {
    expect.assertions(2);
    expect(range(0, 4)).toStrictEqual([0, 1, 2, 3, 4]);
    expect(range(7, 9)).toStrictEqual([7, 8, 9]);
  });
});
