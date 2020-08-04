import AuthManager from "../../src/libs/authManager/authManager";
import { EbsiApps } from "../../src/config";
import ComponentSecureEnclave from "../../src/libs/authManager/secureEnclave/componentSecureEnclave";
import { api, util } from "../../src/utils";
import { TokenType } from "../../src/libs/authManager/secureEnclave/jwt";

describe("authManager tests", () => {
  describe("createAuthNToken test suite", () => {
    it("should create an authN token", async () => {
      expect.assertions(1);
      const mockedSignJwt = jest.fn().mockResolvedValue("tokenJwt");
      jest.spyOn(ComponentSecureEnclave, "Instance", "get").mockImplementation(
        () =>
          ({
            enclaveDid: "did:ebsi:0x00",
            signJwt: mockedSignJwt,
          } as any)
      );
      const jwt = await AuthManager.Instance.createAuthNToken(
        EbsiApps.FILE_STORAGE
      );
      expect(jwt).toMatch("tokenJwt");
      jest.resetAllMocks();
    });
  });

  describe("getAuthZToken test suite", () => {
    it("should throw an Internal Error", async () => {
      expect.assertions(1);
      await expect(
        AuthManager.Instance.getAuthZToken("fake targetApp")
      ).rejects.toThrow("Internal Server Error");
    });

    it("should return a token registered to the map", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPostCallWithoutToken").mockResolvedValue({
        accessToken: "an access token",
        tokenType: TokenType.bearer,
      });
      const token = await AuthManager.Instance.getAuthZToken(
        EbsiApps.FILE_STORAGE
      );
      expect(token).toBeDefined();
      jest.resetAllMocks();
    });

    it("should return the registered token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPostCallWithoutToken").mockResolvedValue({
        accessToken: "an access token",
        tokenType: TokenType.bearer,
      });
      jest.spyOn(util, "isTokenExpired").mockReturnValue(false);
      const token = await AuthManager.Instance.getAuthZToken(
        EbsiApps.FILE_STORAGE
      );

      const receivedToken = await AuthManager.Instance.getAuthZToken(
        EbsiApps.FILE_STORAGE
      );
      expect(receivedToken).toMatch(token);
      jest.resetAllMocks();
    });

    it("should create a new token with token expired", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest
        .spyOn(api, "doPostCallWithoutToken")
        .mockResolvedValueOnce({
          accessToken: "an access token",
          tokenType: TokenType.bearer,
        })
        .mockResolvedValueOnce({
          accessToken: "a new access token",
          tokenType: TokenType.bearer,
        });
      jest.spyOn(util, "isTokenExpired").mockReturnValue(true);
      const token = await AuthManager.Instance.getAuthZToken(
        EbsiApps.FILE_STORAGE
      );

      const receivedToken = await AuthManager.Instance.getAuthZToken(
        EbsiApps.FILE_STORAGE
      );
      expect(receivedToken).not.toMatch(token);
      jest.resetAllMocks();
    });

    it("should throw an error on receiving the access token: undefined", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest
        .spyOn(api, "doPostCallWithoutToken")
        .mockResolvedValue(undefined as any);
      jest.spyOn(util, "isTokenExpired").mockReturnValue(true);
      await expect(
        AuthManager.Instance.getAuthZToken(EbsiApps.FILE_STORAGE)
      ).rejects.toThrow("Internal Server Error");
      jest.resetAllMocks();
    });

    it("should throw an error on receiving the access token: no access token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPostCallWithoutToken").mockResolvedValue({} as any);
      jest.spyOn(util, "isTokenExpired").mockReturnValue(true);
      await expect(
        AuthManager.Instance.getAuthZToken(EbsiApps.FILE_STORAGE)
      ).rejects.toThrow("Internal Server Error");
      jest.resetAllMocks();
    });

    it("should throw an error on receiving the access token: no token type", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPostCallWithoutToken").mockResolvedValue({
        accessToken: "an access token",
      });
      jest.spyOn(util, "isTokenExpired").mockReturnValue(true);
      await expect(
        AuthManager.Instance.getAuthZToken(EbsiApps.FILE_STORAGE)
      ).rejects.toThrow("Internal Server Error");
      jest.resetAllMocks();
    });

    it("should throw an error on receiving the access token: bad token type", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "createAuthNToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPostCallWithoutToken").mockResolvedValue({
        accessToken: "an access token",
        tokenType: "a type",
      });
      jest.spyOn(util, "isTokenExpired").mockReturnValue(true);
      await expect(
        AuthManager.Instance.getAuthZToken(EbsiApps.FILE_STORAGE)
      ).rejects.toThrow("Internal Server Error");
      jest.resetAllMocks();
    });
  });

  describe("do*Call tests", () => {
    it("should call doPost with token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "getAuthZToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPostCallWithToken").mockResolvedValue("OK");
      expect(async () =>
        AuthManager.Instance.doPostCall({}, "", "")
      ).not.toThrow();
      jest.resetAllMocks();
    });

    it("should call doPut with token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "getAuthZToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPutCallWithToken").mockResolvedValue("OK");
      expect(async () =>
        AuthManager.Instance.doPutCall({}, "", "")
      ).not.toThrow();
      jest.resetAllMocks();
    });

    it("should call doPatch with token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "getAuthZToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doPatchCallWithToken").mockResolvedValue("OK");
      expect(async () =>
        AuthManager.Instance.doPatchCall({}, "", "")
      ).not.toThrow();
      jest.resetAllMocks();
    });

    it("should call doDelete with token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "getAuthZToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doDeleteCallWithToken").mockResolvedValue();
      expect(async () =>
        AuthManager.Instance.doDeleteCall("", "")
      ).not.toThrow();
      jest.resetAllMocks();
    });

    it("should call doPostFormCall with token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "getAuthZToken")
        .mockResolvedValue("a token");
      jest
        .spyOn(api, "doPostFormCallWithToken")
        .mockResolvedValue({ hash: "", function: "keccak256" });
      expect(async () =>
        AuthManager.Instance.doPostFormCall(undefined as any, "", "")
      ).not.toThrow();
      jest.resetAllMocks();
    });

    it("should call doGetCall with token", async () => {
      expect.assertions(1);
      jest
        .spyOn(AuthManager.Instance, "getAuthZToken")
        .mockResolvedValue("a token");
      jest.spyOn(api, "doGetCallWithToken").mockResolvedValue("OK");
      expect(async () => AuthManager.Instance.doGetCall("", "")).not.toThrow();
      jest.resetAllMocks();
    });
  });
});
