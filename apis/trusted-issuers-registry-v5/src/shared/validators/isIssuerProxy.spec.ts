import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

// eslint-disable-next-line import/namespace
import * as SharedLib from "@ebsiint-api/shared";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { isIssuerProxy } from "./isIssuerProxy.ts";

const ebsiEnvConfig = {
  hosts: ["api-test.ebsi.eu"],
  network: { name: "test" },
  scheme: "ebsi",
  services: {
    "did-registry": "v5",
    "trusted-issuers-registry": "v5",
    "trusted-policies-registry": "v3",
    "trusted-schemas-registry": "v3",
  },
} satisfies EbsiEnvConfiguration;

describe("isIssuerProxy", () => {
  const mockServer = setupServer();

  beforeAll(() => {
    process.env.AXIOS_RETRY_DELAY = "1"; // 1ms

    // Intercept network requests
    mockServer.listen({
      onUnhandledRequest: ({ url }, print) => {
        // Bypass local requests
        if (new URL(url).hostname === "127.0.0.1") return;

        print.error();
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
    expect(result).toStrictEqual({
      error: "Not a JSON object",
      success: false,
    });
  });

  it("should return false if the proxy doesn't contain a prefix property", async () => {
    const proxy = {};
    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );
    expect(result).toStrictEqual({
      error: "Missing prefix",
      success: false,
    });
  });

  it("should return false if the prefix is not a valid URL", async () => {
    const proxy = {
      headers: {},
      prefix: "not an URL",
      testSuffix: "/credentials",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error:
        "Invalid prefix: it must be a valid URL starting with https:// and without query components or fragments",
      success: false,
    });
  });

  it("should return false if the prefix doesn't start with https", async () => {
    const proxy = {
      headers: {},
      prefix: "http://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error:
        "Invalid prefix: it must be a valid URL starting with https:// and without query components or fragments",
      success: false,
    });
  });

  it("should return false if the proxy headers property is not an object", async () => {
    const proxy = {
      headers: "not an object",
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error: "Missing headers",
      success: false,
    });
  });

  it("should return false if the proxy headers property contains an unauthorized key", async () => {
    const proxy = {
      headers: {
        "Invalid-Header": "value",
      },
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error: 'The following headers are not allowed: "Invalid-Header"',
      success: false,
    });
  });

  it("should return false if the proxy headers property contains an invalid value", async () => {
    const proxy = {
      headers: {
        Authorization: {
          key: "value",
        },
      },
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error: "Some headers contain invalid values",
      success: false,
    });
  });

  it("should return false if the testSuffix property is not a string", async () => {
    const proxy = {
      headers: {},
      prefix: "https://trusted-issuer.com",
      testSuffix: 42,
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error: "Missing testSuffix",
      success: false,
    });
  });

  it("should return false if testSuffix contains a fragment", async () => {
    const proxy = {
      headers: {},
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials#42",
    };

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error: "Invalid testSuffix",
      success: false,
    });
  });

  it("should return false if prefix + testSuffix doesn't resolve (404)", async () => {
    const proxy = {
      headers: {},
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    mockServer.use(
      http.get(
        "https://trusted-issuer.com/credentials",
        () =>
          new HttpResponse("Not found", {
            headers: {
              "Content-Type": "text/plain",
            },
            status: 404,
          }),
      ),
    );

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      error:
        "Error while loading https://trusted-issuer.com/credentials: Request failed with status code 404",
      success: false,
    });
  });

  it("should return false if the credential status list returned by the issuer is invalid", async () => {
    const proxy = {
      headers: {},
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    mockServer.use(
      http.get("https://trusted-issuer.com/credentials", () =>
        HttpResponse.json(""),
      ),
    );

    // The status list returned by the issuer is invalid
    vi.spyOn(SharedLib, "checkStatusList2021Credential").mockImplementation(
      () => Promise.resolve({ error: "error", success: false }),
    );

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({ error: "error", success: false });
  });

  it("should return true if the proxy is valid", async () => {
    const proxy = {
      headers: {},
      prefix: "https://trusted-issuer.com",
      testSuffix: "/credentials",
    };

    mockServer.use(
      http.get("https://trusted-issuer.com/credentials", () =>
        HttpResponse.json(""),
      ),
    );

    // Assume that the status list returned by the issuer is valid
    vi.spyOn(SharedLib, "checkStatusList2021Credential").mockImplementation(
      () => Promise.resolve({ success: true }),
    );

    const result = await isIssuerProxy(
      JSON.stringify(proxy),
      ebsiEnvConfig,
      10,
    );

    expect(result).toStrictEqual({
      success: true,
    });
  });
});
