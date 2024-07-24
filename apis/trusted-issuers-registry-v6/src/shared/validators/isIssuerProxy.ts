import axios, { type AxiosResponse } from "axios";
import { checkStatusList2021Credential } from "@ebsiint-api/shared";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import validator from "validator";

const validators = validator.default;

const allowedRequestHeaders = [
  /**
   * Authentication
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#authentication
   */
  "Authorization",
  /**
   * Caching
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#caching
   */
  "Cache-Control",
].map((i) => i.toLowerCase());

export async function isIssuerProxy(
  value: string,
  ebsiEnvConfig: EbsiEnvConfiguration,
  timeout: number,
): Promise<{ success: true } | { success: false; error: string }> {
  let proxyAsObject: unknown;

  try {
    proxyAsObject = JSON.parse(value) as unknown;
  } catch {
    return { success: false, error: "Not a JSON object" };
  }

  if (!proxyAsObject || typeof proxyAsObject !== "object") {
    return { success: false, error: "Proxy must be an object" };
  }

  const { prefix, headers, testSuffix } = proxyAsObject as Record<
    string,
    unknown
  >;

  // Validate prefix
  if (!prefix || typeof prefix !== "string") {
    return { success: false, error: "Missing prefix" };
  }

  if (
    // Only allow URLs with https protocol and without query components or fragments
    !validators.isURL(prefix, {
      protocols: ["https"],
      require_protocol: true,
      allow_fragments: false,
      allow_query_components: false,
    })
  ) {
    return {
      success: false,
      error:
        "Invalid prefix: it must be a valid URL starting with https:// and without query components or fragments",
    };
  }

  // Validate headers
  if (!headers || typeof headers !== "object") {
    return { success: false, error: "Missing headers" };
  }

  if (
    Object.values(headers).some(
      (val) =>
        typeof val !== "string" &&
        typeof val !== "number" &&
        typeof val !== "boolean",
    )
  ) {
    return {
      success: false,
      error: "Some headers contain invalid values",
    };
  }

  const invalidHeaders = Object.keys(headers).filter(
    (key) => !allowedRequestHeaders.includes(key.toLowerCase()),
  );
  if (invalidHeaders.length > 0) {
    return {
      success: false,
      error: `The following headers are not allowed: "${invalidHeaders.join('", "')}"`,
    };
  }

  // Validate prefix + testSuffix
  if (!testSuffix || typeof testSuffix !== "string") {
    return {
      success: false,
      error: "Missing testSuffix",
    };
  }

  if (
    !validators.isURL(prefix + testSuffix, {
      protocols: ["https"],
      require_protocol: true,
      allow_fragments: false, // do not allow fragments in testSuffix
      allow_query_components: true, // allow query components in testSuffix
    })
  ) {
    return {
      success: false,
      error: "Invalid testSuffix",
    };
  }

  let testResponse: AxiosResponse;
  try {
    // Check if prefix+testSuffix returns a valid StatusList2021Credential
    // https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021credential
    testResponse = await axios.get(prefix + testSuffix, {
      headers,
      timeout,
    });
  } catch (e) {
    return {
      success: false,
      error: `Error while loading ${prefix + testSuffix}${axios.isAxiosError(e) ? `: ${e.message}` : ""}`,
    };
  }

  if (testResponse.status !== 200) {
    return {
      success: false,
      error: `Error while loading ${
        prefix + testSuffix
      }: response status must be 200`,
    };
  }

  return checkStatusList2021Credential(testResponse.data, ebsiEnvConfig, {
    timeout,
  });
}

export default isIssuerProxy;
