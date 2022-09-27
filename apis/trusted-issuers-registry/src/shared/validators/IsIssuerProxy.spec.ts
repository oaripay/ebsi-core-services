import axios from "axios";
import { isIssuerProxy } from "./IsIssuerProxy";
import * as utils from "../utils/isStatusList2021Credential";

describe("isIssuerProxy", () => {
  it("should return true if the proxy is valid", async () => {
    expect.assertions(1);

    jest.spyOn(axios, "get").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        data: "jwt",
      })
    );

    jest
      .spyOn(utils, "isStatusList2021Credential")
      .mockImplementation(() => Promise.resolve(true));

    await expect(
      isIssuerProxy(
        JSON.stringify({
          prefix: "https://example.net",
          headers: {},
          testSuffix: "/creds/1",
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(true);
  });

  it("should return false if the proxy is not a string", async () => {
    expect.assertions(1);

    await expect(
      isIssuerProxy(
        {
          prefix: "https://example.net",
          testSuffix: "/cred/1",
          headers: {},
        },
        "example.net",
        15000
      )
    ).resolves.toBe(false);
  });

  it("should return false if the proxy is not a stringified JSON document", async () => {
    expect.assertions(1);

    await expect(isIssuerProxy("proxy", "example.net", 15000)).resolves.toBe(
      false
    );
  });

  it("should return false if the proxy is missing one of its required properties", async () => {
    expect.assertions(5);

    await expect(
      isIssuerProxy(
        JSON.stringify({
          // prefix: "https://example.net",
          headers: {},
          testSuffix: "/creds/1",
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(false);

    await expect(
      isIssuerProxy(
        JSON.stringify({
          prefix: "https://example.net",
          // headers: {},
          testSuffix: "/creds/1",
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(false);

    await expect(
      isIssuerProxy(
        JSON.stringify({
          prefix: "https://example.net",
          headers: {},
          // testSuffix: "/creds/1",
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(false);

    await expect(
      isIssuerProxy(
        JSON.stringify({
          prefix: "", // empty string are not allowed
          headers: {},
          testSuffix: "/creds/1",
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(false);

    await expect(
      isIssuerProxy(
        JSON.stringify({
          prefix: "https://example.net",
          headers: {},
          testSuffix: "", // empty string are not allowed
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(false);
  });

  it("should return false if the proxy is test endpoint doesn't return a valid StatusList2021Credential JWT", async () => {
    expect.assertions(1);

    jest.spyOn(axios, "get").mockImplementation(() =>
      Promise.resolve({
        status: 200,
        data: "jwt",
      })
    );

    jest
      .spyOn(utils, "isStatusList2021Credential")
      .mockImplementation(() => Promise.reject(new Error("Invalid JWT")));

    await expect(
      isIssuerProxy(
        JSON.stringify({
          prefix: "https://example.net",
          headers: {},
          testSuffix: "/creds/1",
        }),
        "example.net",
        15000
      )
    ).resolves.toBe(false);
  });
});
