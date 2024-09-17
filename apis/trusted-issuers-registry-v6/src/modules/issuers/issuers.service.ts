import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  prefixWith0x,
  remove0xPrefix,
  checkStatusList2021Credential,
} from "@ebsiint-api/shared";
import { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import axios, { type AxiosResponse } from "axios";
import {
  AttributeObject,
  IssuerProxyResponseObject,
  IssuerResponseObject,
} from "./issuers.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import {
  getBuiltGraphSDK,
  GetIssuersQuery,
  GetIssuerQuery,
  GetAttributesQuery,
  GetAttributeQuery,
  GetRevisionsQuery,
  GetProxiesQuery,
  GetProxyQuery,
  Issuer_filter,
  Attribute_filter,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  private timeout: number;

  private ebsiEnvConfig: EbsiEnvConfiguration;

  constructor(configService: ConfigService<ApiConfig, true>) {
    const domain = configService.get("domain", { infer: true });
    const ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    const trustedHostnames = configService.get<string[]>("trustedHostnames");
    this.ebsiEnvConfig = {
      network: configService.get("network", { infer: true }),
      hosts: [ebsiAuthority, ...trustedHostnames],
      services: {
        "did-registry": "v6",
        "trusted-issuers-registry": "v6",
        "trusted-policies-registry": "v4",
        "trusted-schemas-registry": "v4",
      },
    };
    this.timeout = configService.get<number>("requestTimeout");
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
      res = await sdk.GetIssuers({ skip, pagesize: queryPageSize, where });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const dids = res.issuers.map((i) => i.id);
    return { items: dids };
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
      did,
      attributes: res.issuer.attributes.map((a) => ({
        hash: remove0xPrefix(a.lastRevision.id),
        body: a.lastRevision.data,
        issuerType: a.lastRevision.issuerType,
        tao: a.lastRevision.tao,
        rootTao: a.lastRevision.rootTao,
      })),
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
        skip,
        pagesize: queryPageSize,
        did,
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

  async getAttribute(
    did: string,
    attributeId: string,
  ): Promise<AttributeObject> {
    let res: GetAttributeQuery;
    try {
      res = await sdk.GetAttribute({
        did,
        attributeId: prefixWith0x(attributeId),
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
      hash: remove0xPrefix(res.issuer.attributes[0]!.lastRevision.id),
      body: res.issuer.attributes[0]!.lastRevision.data,
      issuerType: res.issuer.attributes[0]!.lastRevision.issuerType,
      tao: res.issuer.attributes[0]!.lastRevision.tao,
      rootTao: res.issuer.attributes[0]!.lastRevision.rootTao,
    };
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
        skip,
        pagesize: queryPageSize,
        did,
        attributeId: prefixWith0x(attributeId),
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
      hash: remove0xPrefix(r.id),
      body: r.data,
      issuerType: r.issuerType,
      tao: r.tao,
      rootTao: r.rootTao,
    }));
    return { items: revisions };
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
      res = await sdk.GetProxies({ skip, pagesize: queryPageSize, did });
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

  async proxyRequest(did: string, proxyId: string, url: string) {
    const proxy = await this.getIssuerProxy(did, proxyId);

    // Extract subpath from request URL
    const found = url.match(/\/issuers\/.*\/proxies\/\w*\/(.*)$/);
    if (!found || !found[1]) {
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
    } catch (e) {
      if (e instanceof Error) {
        this.logger.error(
          `Status List Credential ${credRequestUrl} unreachable - ${e.message}`,
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
