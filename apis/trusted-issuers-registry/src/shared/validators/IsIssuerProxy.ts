import { Injectable } from "@nestjs/common";
import {
  buildMessage,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import validator from "validator";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { isStatusList2021Credential } from "@ebsiint-api/shared";
import { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import type { ApiConfig } from "../../config/configuration.js";

const validators = validator.default;

export const IS_ISSUER_PROXY = "isIssuerProxy";

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

function isRequestHeaders(
  headers: unknown,
): headers is Record<string, string | number | boolean> {
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
      allowedRequestHeaders.includes(key.toLowerCase()),
    )
  ) {
    return false;
  }

  return true;
}

export async function isIssuerProxy(
  value: unknown,
  ebsiEnvConfig: EbsiEnvConfiguration,
  timeout: number,
): Promise<boolean> {
  if (typeof value !== "string") return false;

  try {
    const proxyAsObject = JSON.parse(value) as unknown;

    if (!proxyAsObject || typeof proxyAsObject !== "object") return false;

    const { prefix, headers, testSuffix } = proxyAsObject as Record<
      string,
      unknown
    >;

    // Validate prefix
    if (
      !prefix ||
      typeof prefix !== "string" ||
      // Only allow URLs with https protocol and without query components or fragments
      !validators.isURL(prefix, {
        protocols: ["https"],
        require_protocol: true,
        allow_fragments: false,
        allow_query_components: false,
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
        protocols: ["https"],
        require_protocol: true,
        allow_fragments: false, // do not allow fragments in testSuffix
        allow_query_components: true, // allow query components in testSuffix
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
      !(await isStatusList2021Credential(testResponse.data, ebsiEnvConfig, {
        skipAccreditationsValidation: true,
      }))
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

@ValidatorConstraint({ name: IS_ISSUER_PROXY, async: true })
@Injectable()
export class IsIssuerProxy implements ValidatorConstraintInterface {
  private ebsiEnvConfig: EbsiEnvConfiguration;

  private timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    const domain = configService.get("domain", { infer: true });
    const ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    const trustedHostnames = configService.get<string[]>("trustedHostnames");
    this.ebsiEnvConfig = {
      network: configService.get("network", { infer: true }),
      hosts: [ebsiAuthority, ...trustedHostnames],
      services: {
        "did-registry": "v4",
        "trusted-issuers-registry": "v3",
        "trusted-policies-registry": "v2",
        "trusted-schemas-registry": "v2",
      },
    };
    this.timeout = configService.get<number>("requestTimeout");
  }

  async validate(value: unknown) {
    return isIssuerProxy(value, this.ebsiEnvConfig, this.timeout);
  }

  defaultMessage(validationArguments?: ValidationArguments) {
    return buildMessage(
      (eachPrefix) =>
        `${eachPrefix}$property must be a valid issuer proxy (stringified JSON document)`,
    )(validationArguments);
  }
}
