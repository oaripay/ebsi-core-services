import { ComponentSecureEnclave } from "../../src/libs/authManager/secureEnclave";
import { COMPONENT_KEYSTORE } from "../../src/config";

describe("componentSecureEnclave test suite", () => {
  it("should throw InternalError with no encryptedKeystore", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;
    se.enclaveDid = "";

    await expect(se.init(undefined as any)).rejects.toThrow(
      "Internal Server Error"
    );
  });

  it("should throw InternalError with no did: getPublicKey", () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;
    se.enclaveDid = "";

    expect(() => se.getPublicKey("")).toThrow("Internal Server Error");
  });

  it("should throw InternalError with no did: exportEncryptedKeys", () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;
    se.enclaveDid = "";

    expect(() => se.exportEncryptedKeys("")).toThrow("Internal Server Error");
  });

  it("should throw InternalError with no did: signJwt", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;
    se.enclaveDid = "";

    await expect(se.signJwt("", {} as any)).rejects.toThrow(
      "Internal Server Error"
    );
  });

  it("should throw InternalError with no did: encrypt", () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;
    se.enclaveDid = "";

    expect(() => se.encrypt("" as any)).toThrow("Internal Server Error");
  });

  it("should throw InternalError with no did: decrypt", () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;
    se.enclaveDid = "";

    expect(() => se.decrypt("" as any)).toThrow("Internal Server Error");
  });

  it("should create a wallet and save it to DB if it does not exist", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    const { did } = await se.init(COMPONENT_KEYSTORE);
    expect(did).toContain("did:ebsi");
  });

  it("should return public key", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    const { did } = await se.init(COMPONENT_KEYSTORE);
    expect(se.getPublicKey(did)).toMatch(
      "0x0474eb1b5c57c426c77096cadf80b653ae43e66d4367ede4cdcb47630274dede1ddd17739f7c420d32a4bd4459e8dae58a4c7efd96edcb6de82ccc5f3054f6603e"
    );
  });

  it("should export encryptedKey", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    const { did } = await se.init(COMPONENT_KEYSTORE);
    expect(se.exportEncryptedKeys(did)).toBeDefined();
  });

  it("should sign", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    const { did } = await se.init(COMPONENT_KEYSTORE);
    const data = Buffer.from(JSON.stringify({ data: "some test data" }));
    const signature = await se.signJwt(did, data);
    expect(signature).toBeDefined();
  });

  it("should decrypt what is encrypted", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    await se.init(COMPONENT_KEYSTORE);
    const data = Buffer.from(JSON.stringify({ data: "some test data" }));
    expect(se.decrypt(se.encrypt(data))).toMatchObject(data);
  });
});
