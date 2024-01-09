import { describe, it, expect } from "vitest";
import { extractNamedAttributes } from "./extractNamedAttributes.js";

describe("extractNameAttributes", () => {
  it("should convert BigNumber to hexstring", () => {
    const data = [42] as const;
    [(data as unknown as { policyId: number }).policyId] = data;
    expect(extractNamedAttributes(data)).toStrictEqual({
      policyId: 42,
    });
  });
});
