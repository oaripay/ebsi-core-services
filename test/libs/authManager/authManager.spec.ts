import ComponentSecureEnclave from "src/libs/secureEnclave/componentSecureEnclave";
import { AuthManager } from "src/libs/authManager/authManager";
import { EBSI_APPS, COMPONENT_KEYSTORE } from "src/config";
import { IUserAuthZToken } from "src/libs/secureEnclave/jwt";

describe("authManager tests", () => {
  it("should create an AuthN token", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    await se.init(COMPONENT_KEYSTORE);

    const token = await AuthManager.Instance.getAuthZToken(EBSI_APPS.STORAGE);
    expect(token).toBeDefined();
  });

  it("should create an AuthZ token", async () => {
    expect.assertions(1);
    const did = "did:ebsi:0x7f9273a6F709f3A08772a8612c427069a4720E64";
    await ComponentSecureEnclave.Instance.init(COMPONENT_KEYSTORE);

    const payload: IUserAuthZToken = {
      did,
      userName: "Jara&EBSI",
      userId: "jara",
      sub: "jara",
    };

    const token = await AuthManager.Instance.createAuthorizationToken(
      payload,
      did
    );
    expect(token).toBeDefined();
  });
});
