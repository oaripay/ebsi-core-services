import AuthManager from "../../../src/libs/authManager/AuthManager";
import ComponentSecureEnclave from "../../../src/libs/authManager/secureEnclave/ComponentSecureEnclave";
import { COMPONENT_KEYSTORE, EBSI_APPS } from "../../../src/config";

describe("authManager tests", () => {
  it("should create an AuthN token", async () => {
    expect.assertions(1);
    const se = ComponentSecureEnclave.Instance;

    await se.init(COMPONENT_KEYSTORE);

    const token = await AuthManager.Instance.getAuthZToken(EBSI_APPS.STORAGE);
    expect(token).toBeDefined();
  });
});
