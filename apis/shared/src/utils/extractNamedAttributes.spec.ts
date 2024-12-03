import { describe, expect, it } from "vitest";

import { extractNamedAttributes } from "./extractNamedAttributes.js";

describe("extractNameAttributes", () => {
  it("should convert a mixed array into an object", () => {
    expect.assertions(1);

    const data = [42] as const;
    [(data as unknown as { policyId: number }).policyId] = data;

    // data is: [ 42, policyId: 42 ]

    expect(extractNamedAttributes(data)).toStrictEqual({
      policyId: 42,
    });
  });
});
