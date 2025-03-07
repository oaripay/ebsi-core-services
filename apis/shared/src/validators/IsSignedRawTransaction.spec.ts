import { ethers } from "ethers";
import { describe, expect, it } from "vitest";

import { isSignedRawTransaction } from "./IsSignedRawTransaction.ts";

describe("IsSignedRawTransaction", () => {
  it("should only accept legacy transactions", async () => {
    // bad context
    expect(isSignedRawTransaction("")).toStrictEqual({
      error: "signedRawTransaction must be an hexadecimal string",
      success: false,
    });
    expect(isSignedRawTransaction("bad-context")).toStrictEqual({
      error: "signedRawTransaction must be an hexadecimal string",
      success: false,
    });
    expect(isSignedRawTransaction("{}")).toStrictEqual({
      error: "signedRawTransaction must be an hexadecimal string",
      success: false,
    });
    expect(isSignedRawTransaction("0x")).toStrictEqual({
      error: "Only type 0 (legacy) transactions are supported",
      success: false,
    });

    const wallet = ethers.Wallet.createRandom();

    expect(
      isSignedRawTransaction(
        // Type 1 transaction
        await wallet.signTransaction({ type: 1, value: "0x00" }),
      ),
    ).toStrictEqual({
      error: "Only type 0 (legacy) transactions are supported",
      success: false,
    });
    expect(
      isSignedRawTransaction(
        // Type 2 transaction
        await wallet.signTransaction({ type: 2, value: "0x00" }),
      ),
    ).toStrictEqual({
      error: "Only type 0 (legacy) transactions are supported",
      success: false,
    });
    expect(
      isSignedRawTransaction(
        // Type 0 transaction
        await wallet.signTransaction({ type: 0, value: "0x00" }),
      ),
    ).toStrictEqual({
      success: true,
    });
  });
});
