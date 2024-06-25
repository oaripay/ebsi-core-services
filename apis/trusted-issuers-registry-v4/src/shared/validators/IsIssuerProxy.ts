import { Injectable } from "@nestjs/common";
import {
  buildMessage,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { isStatusList2021Credential } from "@ebsiint-api/shared";
import { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import type { ApiConfig } from "../../config/configuration.js";

export const IS_ISSUER_PROXY = "isIssuerProxy";

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
  value: unknown,
  ebsiEnvConfig: EbsiEnvConfiguration,
  timeout: number,
): Promise<boolean> {
  if (typeof value !== "string") return false;

  try {
    const proxyAsObject = JSON.parse(value) as unknown;

    if (typeof proxyAsObject !== "object") return false;

    const { prefix, headers, testSuffix } = proxyAsObject as Record<
      string,
      unknown
    >;

    if (!prefix || typeof prefix !== "string") return false;
    if (!isRequestHeaders(headers)) return false;
    if (!testSuffix || typeof testSuffix !== "string") return false;

    // Check if prefix+testSuffix returns a valid StatusList2021Credential
    // https://w3c-ccg.github.io/vc-status-list-2021/#statuslist2021credential
    const testResponse = await axios.get(prefix + testSuffix, {
      headers,
      timeout,
    });

    if (testResponse.status !== 200) return false;

    if (!(await isStatusList2021Credential(testResponse.data, ebsiEnvConfig))) {
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
        "trusted-issuers-registry": "v4",
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
