import AuthManager from "../../../src/libs/authManager/authManager";
import { EBSI_APPS } from "../../../src/config";
import ComponentSecureEnclave from "../../../src/libs/authManager/secureEnclave/componentSecureEnclave";

describe("authManager tests", () => {
  it("should create an authorization token", async () => {
    expect.assertions(1);
    const payload = { data: "test sample data" };
    const mockedSignJwt = jest.fn().mockResolvedValue("tokenJwt");
    jest.spyOn(ComponentSecureEnclave, "Instance", "get").mockImplementation(
      () =>
        ({
          enclaveDid: "did:ebsi:0x00",
          signJwt: mockedSignJwt,
        } as any)
    );
    const token = await AuthManager.Instance.createAuthorizationToken(payload);
    expect(token).toBeDefined();
  });

  it("should create an authorization token with subject", async () => {
    expect.assertions(1);
    const payload = { data: "test sample data" };
    const mockedSignJwt = jest.fn().mockResolvedValue("tokenJwt");
    jest.spyOn(ComponentSecureEnclave, "Instance", "get").mockImplementation(
      () =>
        ({
          enclaveDid: "did:ebsi:0x00",
          signJwt: mockedSignJwt,
        } as any)
    );
    const token = await AuthManager.Instance.createAuthorizationToken(
      payload,
      EBSI_APPS.WALLET
    );
    expect(token).toBeDefined();
  });
});
