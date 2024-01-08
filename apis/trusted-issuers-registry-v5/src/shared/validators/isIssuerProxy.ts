import axios, { type AxiosResponse } from "axios";
import { checkStatusList2021Credential } from "@ebsiint-api/shared";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";

function isRequestHeaders(
  headers: unknown,
): headers is Record<string, string | number | boolean> {
  if (!headers || typeof headers !== "object") return false;

  return !Object.values(headers).some(
    (val) =>
      typeof val !== "string" &&
      typeof val !== "number" &&
      typeof val !== "boolean",
  );
}

export async function isIssuerProxy(
  value: string,
  authority: string,
  timeout: number,
  trustedHostnames?: string[],
  ebsiEnvConfig?: EbsiEnvConfiguration,
): Promise<{ success: true } | { success: false; error: string }> {
  let proxyAsObject: unknown;

  try {
    proxyAsObject = JSON.parse(value) as unknown;
  } catch {
    return { success: false, error: "Not a JSON object" };
  }

  if (typeof proxyAsObject !== "object") {
    return { success: false, error: "Proxy must be an object" };
  }

  const { prefix, headers, testSuffix } = proxyAsObject as Record<
    string,
    unknown
  >;

  if (!prefix || typeof prefix !== "string") {
    return { success: false, error: "Missing prefix" };
  }

  if (!isRequestHeaders(headers)) {
    return { success: false, error: "Missing headers" };
  }

  if (!testSuffix || typeof testSuffix !== "string") {
    return {
      success: false,
      error: "Missing testSuffix",
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
  } catch {
    return {
      success: false,
      error: `Error while loading ${prefix + testSuffix}`,
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

  try {
    return await checkStatusList2021Credential(testResponse.data, authority, {
      ...(trustedHostnames && { trustedHostnames }),
      ...(ebsiEnvConfig && { ebsiEnvConfig }),
    });
  } catch {
    return { success: false, error: "Not a StatusList2021Credential" };
  }
}

export default isIssuerProxy;
