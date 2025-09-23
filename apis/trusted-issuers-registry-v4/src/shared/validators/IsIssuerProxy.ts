import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import type {
  ValidationArguments,
  ValidatorConstraintInterface,
} from "class-validator";

import { isStatusList2021Credential } from "@ebsiint-api/shared";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { buildMessage, ValidatorConstraint } from "class-validator";
import validator from "validator";

import type { ApiConfig } from "../../config/configuration.ts";

const validators = validator.default;

export const IS_ISSUER_PROXY = "isIssuerProxy";

const allowedRequestHeaders = new Set(
  [
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
  ].map((i) => i.toLowerCase()),
);

export async function isIssuerProxy(
  value: unknown,
  ebsiEnvConfig: EbsiEnvConfiguration,
  reqId: string,
  timeout: number,
): Promise<boolean> {
  if (typeof value !== "string") return false;

  try {
    const proxyAsObject = JSON.parse(value);

    if (!proxyAsObject || typeof proxyAsObject !== "object") return false;

    const { headers, prefix, testSuffix } = proxyAsObject as Record<
      string,
      unknown
    >;

    // Validate prefix
    if (
      !prefix ||
      typeof prefix !== "string" ||
      // Only allow URLs with https protocol and without query components or fragments
      !validators.isURL(prefix, {
        allow_fragments: false,
        allow_query_components: false,
        protocols: ["https"],
        require_protocol: true,
      })
    ) {
      return false;
    }

    // Validate headers
    if (!isRequestHeaders(headers)) {
      return false;
    }

    // Validate prefix + testSuffix
    if (
      !testSuffix ||
      typeof testSuffix !== "string" ||
      !validators.isURL(prefix + testSuffix, {
        allow_fragments: false, // do not allow fragments in testSuffix
        allow_query_components: true, // allow query components in testSuffix
        protocols: ["https"],
        require_protocol: true,
      })
    ) {
      return false;
    }

    // Check if prefix+testSuffix returns a valid StatusList2021Credential
    // https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021credential
    const testResponse = await axios.get(prefix + testSuffix, {
      headers,
      timeout,
    });

    if (testResponse.status !== 200) {
      return false;
    }

    if (
      !(await isStatusList2021Credential(
        testResponse.data,
        ebsiEnvConfig,
        reqId,
      ))
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

function isRequestHeaders(
  headers: unknown,
): headers is Record<string, boolean | number | string> {
  if (!headers || typeof headers !== "object") return false;

  if (
    Object.values(headers).some(
      (val) =>
        typeof val !== "string" &&
        typeof val !== "number" &&
        typeof val !== "boolean",
    )
  ) {
    return false;
  }

  if (
    !Object.keys(headers).every((key) =>
      allowedRequestHeaders.has(key.toLowerCase()),
    )
  ) {
    return false;
  }

  return true;
}

@Injectable()
@ValidatorConstraint({ async: true, name: IS_ISSUER_PROXY })
export class IsIssuerProxy implements ValidatorConstraintInterface {
  private ebsiEnvConfig: EbsiEnvConfiguration;

  private readonly timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.ebsiEnvConfig = configService.get("ebsiEnvConfig", { infer: true });
    this.timeout = configService.get("requestTimeout", { infer: true });
  }

  defaultMessage(validationArguments?: ValidationArguments) {
    return buildMessage(
      (eachPrefix) =>
        `${eachPrefix}$property must be a valid issuer proxy (stringified JSON document)`,
    )(validationArguments);
  }

  async validate(value: unknown) {
    return isIssuerProxy(
      value,
      this.ebsiEnvConfig,
      "", // Known issue: we can't pass the request ID to isIssuerProxy because it's not available in this context
      this.timeout,
    );
  }
}
