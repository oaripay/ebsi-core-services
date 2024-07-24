import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import * as SharedLib from "@ebsiint-api/shared";
import { isIssuerProxy } from "./IsIssuerProxy.js";

const ebsiEnvConfig = {
  network: "test",
  hosts: ["api-test.ebsi.eu"],
  services: {
    "did-registry": "v4",
    "trusted-issuers-registry": "v4",
    "trusted-policies-registry": "v2",
    "trusted-schemas-registry": "v2",
  },
} satisfies EbsiEnvConfiguration;

describe("isIssuerProxy", () => {
  const mockServer = setupServer();

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ method, url }) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        throw new Error(`Unhandled ${method} request to ${url}`);
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockServer.resetHandlers();
  });

  afterAll(() => {
    mockServer.close();
  });

  it("should return false if the proxy is not a stringified object", async () => {
    const proxy = "not a valid proxy";
    const result = await isIssuerProxy(proxy, ebsiEnvConfig, 10);
    expect(result).toBe(false);
  });

  it("should return false if the proxy doesn't contain a prefix property", async () => {
    const proxy = {};
    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );
    expect(result).toBe(false);
  });

  it("should return false if the prefix is not a valid URL", async () => {
    const proxy = {
      prefix: "not an URL",
      testSuffix: "/credentials",
      headers: {},
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if the prefix doesn't start with https", async () => {
    const proxy = {
      prefix: "http://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: {},
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if the proxy headers property is not an object", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: "not an object",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if the proxy headers property contains an unauthorized key", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: {
        "Invalid-Header": "value",
      },
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if the proxy headers property contains an invalid value", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: {
        Authorization: {
          key: "value",
        },
      },
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if the testSuffix property is not a string", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: 42,
      headers: {},
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if testSuffix contains a fragment", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials#42",
      headers: {},
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if prefix + testSuffix doesn't resolve (404)", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: {},
    };

    mockServer.use(
      http.get(
        "https://trusted-issuer.com/credentials",
        () =>
          new HttpResponse("Not found", {
            status: 404,
            headers: {
              "Content-Type": "text/plain",
            },
          }),
      ),
    );

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return false if the credential status list returned by the issuer is invalid", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: {},
    };

    mockServer.use(
      http.get("https://trusted-issuer.com/credentials", () =>
        HttpResponse.json(""),
      ),
    );

    // The status list returned by the issuer is invalid
    vi.spyOn(SharedLib, "isStatusList2021Credential").mockImplementation(
      async () => Promise.resolve(false),
    );

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(false);
  });

  it("should return true if the proxy is valid", async () => {
    const proxy = {
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
      headers: {},
    };

    mockServer.use(
      http.get("https://trusted-issuer.com/credentials", () =>
        HttpResponse.json(""),
      ),
    );

    // Assume that the status list returned by the issuer is valid
    vi.spyOn(SharedLib, "isStatusList2021Credential").mockImplementation(
      async () => Promise.resolve(true),
    );

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toBe(true);
  });
});
