import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import type { AxiosResponse } from "axios";

import {
  BadRequestError,
  checkStatusList2021Credential,
  InternalServerError,
  NotFoundError,
  prefixWith0x,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

import type {
  Attribute_filter,
  GetAttributeQuery,
  GetAttributesQuery,
  GetIssuerQuery,
  GetIssuersQuery,
  GetProxiesQuery,
  GetProxyQuery,
  GetRevisionsQuery,
  Issuer_filter,
} from "../../../.graphclient/index.js";
import type { ApiConfig } from "../../config/configuration.ts";
import type {
  AttributeObject,
  IssuerProxyResponseObject,
  IssuerResponseObject,
} from "./issuers.interface.ts";

import { getBuiltGraphSDK } from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class IssuersService {
  private ebsiEnvConfig: EbsiEnvConfiguration;

  private readonly logger = new Logger(IssuersService.name);

  private readonly timeout: number;

  constructor(configService: ConfigService<ApiConfig, true>) {
    this.ebsiEnvConfig = configService.get("ebsiEnvConfig", { infer: true });
    this.timeout = configService.get("requestTimeout", { infer: true });
  }

  async getAttribute(
    did: string,
    attributeId: string,
  ): Promise<AttributeObject> {
    let res: GetAttributeQuery;
    try {
      res = await sdk.GetAttribute({
        attributeId: prefixWith0x(attributeId),
        did,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuer) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    if (
      !res.issuer.attributes ||
      res.issuer.attributes.length === 0 ||
      !res.issuer.attributes[0]!.lastRevision
    ) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    return {
      body: res.issuer.attributes[0]!.lastRevision.data,
      hash: remove0xPrefix(res.issuer.attributes[0]!.lastRevision.id),
      issuerType: res.issuer.attributes[0]!.lastRevision.issuerType,
      rootTao: res.issuer.attributes[0]!.lastRevision.rootTao,
      tao: res.issuer.attributes[0]!.lastRevision.tao,
    };
  }

  async getAttributes(
    did: string,
    page: number,
    pagesize: number,
    where: Attribute_filter,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetAttributesQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetAttributes({
        did,
        pagesize: queryPageSize,
        skip,
        where,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuer) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    const attributes = res.issuer.attributes.map((i) => remove0xPrefix(i.id));
    return { items: attributes };
  }

  async getIssuer(did: string): Promise<IssuerResponseObject> {
    let res: GetIssuerQuery;
    try {
      res = await sdk.GetIssuer({ did });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuer) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    return {
      attributes: res.issuer.attributes.map((a) => ({
        body: a.lastRevision.data,
        hash: remove0xPrefix(a.lastRevision.id),
        issuerType: a.lastRevision.issuerType,
        rootTao: a.lastRevision.rootTao,
        tao: a.lastRevision.tao,
      })),
      did,
    };
  }

  async getIssuerProxies(
    did: string,
    page: number,
    pagesize: number,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetProxiesQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetProxies({ did, pagesize: queryPageSize, skip });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuer) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    const proxies = res.issuer.proxies.map((i) => i.id);
    return { items: proxies };
  }

  async getIssuerProxy(
    did: string,
    proxyId: string,
  ): Promise<IssuerProxyResponseObject> {
    let res: GetProxyQuery;
    try {
      res = await sdk.GetProxy({ did, proxyId });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuer) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    if (
      !res.issuer.proxies ||
      res.issuer.proxies.length === 0 ||
      !res.issuer.proxies[0]!.data
    ) {
      throw new NotFoundError("Proxy Not Found", {
        detail: `Proxy ${proxyId} of issuer ${did} can't be found`,
      });
    }

    try {
      return JSON.parse(
        res.issuer.proxies[0]!.data,
      ) as IssuerProxyResponseObject;
    } catch {
      throw new InternalServerError("Invalid Proxy", {
        detail: "The server was unable to parse the requested proxy",
      });
    }
  }

  async getIssuers(
    page: number,
    pagesize: number,
    where: Issuer_filter,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetIssuersQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetIssuers({ pagesize: queryPageSize, skip, where });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuers) return { items: [] };

    const dids = res.issuers.map((i) => i.id);
    return { items: dids };
  }

  async getRevisions(
    did: string,
    attributeId: string,
    page: number,
    pagesize: number,
  ): Promise<{ items: AttributeObject[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetRevisionsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetRevisions({
        attributeId: prefixWith0x(attributeId),
        did,
        pagesize: queryPageSize,
        skip,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.issuer) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    if (
      !res.issuer.attributes ||
      res.issuer.attributes.length === 0 ||
      !res.issuer.attributes[0]!.revisions
    ) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attributeId} not found`,
      });
    }

    const revisions = res.issuer.attributes[0]!.revisions.map((r) => ({
      body: r.data,
      hash: remove0xPrefix(r.id),
      issuerType: r.issuerType,
      rootTao: r.rootTao,
      tao: r.tao,
    }));
    return { items: revisions };
  }

  async proxyRequest(did: string, proxyId: string, url: string) {
    const proxy = await this.getIssuerProxy(did, proxyId);

    // Extract subpath from request URL
    const found = /\/issuers\/.*\/proxies\/\w*\/(.*)$/.exec(url);
    if (!found?.[1]) {
      throw new BadRequestError("Invalid Proxy", {
        detail: "The server was unable to parse the requested proxy",
      });
    }
    const subpath = found[1];

    // Send request to issuer's endpoint
    const credRequestUrl = `${proxy.prefix}/${subpath}`;
    let res: AxiosResponse;
    try {
      res = await axios.get(credRequestUrl, {
        headers: proxy.headers,
        timeout: this.timeout,
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Status List Credential ${credRequestUrl} unreachable - ${error.message}`,
        );
      }

      throw new InternalServerError("Unreachable Status List Credential", {
        detail: "The Status List Credential can't be retrieved",
      });
    }

    // Validate result (must be a valid StatusList2021Credential JWT)
    if (typeof res.data !== "string") {
      throw new InternalServerError("Invalid Status List Credential", {
        detail:
          "The Status List Credential returned by the Issuer's proxy is not a JWT",
      });
    }

    const statusListValidation = await checkStatusList2021Credential(
      res.data,
      this.ebsiEnvConfig,
    );

    if (!statusListValidation.success) {
      this.logger.error(
        `The Status List Credential returned by the Issuer's proxy is invalid: ${statusListValidation.error}`,
      );

      throw new InternalServerError("Invalid Status List Credential", {
        detail:
          "The Status List Credential returned by the Issuer's proxy is invalid",
      });
    }

    return res.data;
  }
}

export default IssuersService;
