import { Injectable, Logger } from "@nestjs/common";
import { Tir } from "@ebsiint-sc/trusted-issuers-registry-v3";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
  prefixWith0x,
  isEthersError,
  remove0xPrefix,
  checkStatusList2021Credential,
} from "@ebsiint-api/shared";
import type { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import axios, { type AxiosResponse } from "axios";
import { LedgerService } from "../ledger/ledger.service.js";
import {
  AttributeObject,
  IssuerProxyResponseObject,
  IssuerResponseObject,
} from "./issuers.interface.js";
import type { ApiConfig } from "../../config/configuration.js";
import { IssuerTypeNames } from "./issuers.constants.js";

@Injectable()
export class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  private ebsiEnvConfig: EbsiEnvConfiguration;

  private timeout: number;

  constructor(
    private ledgerService: LedgerService,
    configService: ConfigService<ApiConfig, true>,
  ) {
    const domain = configService.get("domain", { infer: true });
    const ebsiAuthority = domain.replace(/^https?:\/\//, ""); // remove http protocol scheme
    const trustedHostnames = configService.get<string[]>("trustedHostnames");
    this.ebsiEnvConfig = {
      network: configService.get("network", { infer: true }),
      hosts: [ebsiAuthority, ...trustedHostnames],
      services: {
        "did-registry": "v5",
        "trusted-issuers-registry": "v5",
        "trusted-policies-registry": "v3",
        "trusted-schemas-registry": "v3",
      },
    };
    this.timeout = configService.get<number>("requestTimeout");
  }

  async getIssuers(
    page: number,
    pageSize: number,
  ): ReturnType<Tir["getIssuers"]> {
    try {
      return await this.ledgerService.getContract().getIssuers(page, pageSize);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Failed to get issuers", {
        detail: "Failed to get issuers",
      });
    }
  }

  async getAttributeRevision(revisionId: string): Promise<AttributeObject> {
    // This function assumes that the revisionId exists
    const hash = prefixWith0x(revisionId);

    let attributeByHash: Awaited<ReturnType<Tir["getIssuerAttributeByHash"]>>;

    try {
      attributeByHash = await this.ledgerService
        .getContract()
        .getIssuerAttributeByHash(hash);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${hash} not found`,
      });
    }

    const { attribData, tao, rootTao, issuerType } = attributeByHash;
    const attributeData = Buffer.from(
      remove0xPrefix(attribData),
      "hex",
    ).toString();

    return {
      hash: hash.slice(2),
      body: attributeData,
      issuerType: IssuerTypeNames[issuerType]!,
      tao,
      rootTao,
    };
  }

  async getAttribute(attributeId: string): Promise<AttributeObject> {
    const hash = prefixWith0x(attributeId);
    let revisionHashes: Awaited<ReturnType<Tir["getIssuerAttributeRevisions"]>>;
    try {
      // get the first attribute revision
      revisionHashes = await this.ledgerService
        .getContract()
        .getIssuerAttributeRevisions(hash, 1, 1);

      // use total revisions to get the latest attribute revision
      const totalRevisions = revisionHashes.total.toNumber();
      revisionHashes = await this.ledgerService
        .getContract()
        .getIssuerAttributeRevisions(hash, totalRevisions, 1);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} not found`,
      });
    }

    return this.getAttributeRevision(revisionHashes.items[0]!);
  }

  async getAttributes(issuerDid: string): Promise<AttributeObject[]> {
    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.ledgerService
        .getContract()
        .getIssuer(issuerDid);

      if (attributesLastHash.length === 0) {
        throw new Error();
      }
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${issuerDid} not found`,
      });
    }

    return Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.getAttributeRevision(hash);
      }),
    );
  }

  async assertIssuerExists(did: string): Promise<void> {
    try {
      await this.ledgerService.getContract().getIssuer(did);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }
  }

  async getIssuer(did: string): Promise<IssuerResponseObject> {
    const attributes = await this.getAttributes(did);
    return { did, attributes };
  }

  async didIncludesAttribute(
    did: string,
    attributeId: string,
  ): Promise<boolean> {
    const attribId = prefixWith0x(attributeId);
    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.ledgerService
        .getContract()
        .getIssuer(did);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    if (attributesLastHash.length === 0) {
      throw new Error();
    }

    // /!\ only checks the first 50 revisions of each hash
    // Known issue: if there are more than 50 revisions, didIncludesAttribute may wrongly return false
    try {
      const revisionHashesList = await Promise.all(
        attributesLastHash.map(async (hash) => {
          return this.ledgerService
            .getContract()
            .getIssuerAttributeRevisions(hash, 1, 50);
        }),
      );

      return !!revisionHashesList.find((revisionHashes) => {
        return revisionHashes.items.find((hash) => hash === attribId);
      });
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${attribId} not found`,
      });
    }
  }

  async getIssuerAttributeIdRevisions(
    attributeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ revisions: AttributeObject[]; total: number }> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    try {
      const revisionHashes = await this.ledgerService
        .getContract()
        .getIssuerAttributeRevisions(hash, page, pageSize);

      const revisions = await Promise.all(
        revisionHashes.items.map(async (revisionHash) => {
          return this.getAttributeRevision(revisionHash);
        }),
      );

      return { revisions, total: revisionHashes.total.toNumber() };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute with ${hash} not found`,
      });
    }
  }

  async getIssuerProxies(did: string) {
    // Make sure the issuer exists
    await this.assertIssuerExists(did);

    let proxies: Awaited<ReturnType<Tir["getIssuerProxies"]>>;

    try {
      proxies = await this.ledgerService.getContract().getIssuerProxies(did);
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    return proxies;
  }

  async getIssuerProxy(did: string, proxyId: string) {
    // Make sure the issuer exists
    await this.assertIssuerExists(did);

    let proxy: string;
    try {
      proxy = await this.ledgerService
        .getContract()
        .getIssuerProxyById(did, proxyId);

      // Throw an error if the proxy is empty (i.e. not found)
      if (!proxy) throw new Error();
    } catch (e) {
      if (isEthersError(e)) {
        this.logger.error(e, e.stack);
      }
      throw new NotFoundError("Proxy Not Found", {
        detail: `Proxy ${proxyId} of issuer ${did} can't be found`,
      });
    }

    // Parse proxy string -> JSON Object
    try {
      return JSON.parse(proxy) as IssuerProxyResponseObject;
    } catch {
      throw new InternalServerError("Invalid Proxy", {
        detail: "The server was unable to parse the requested proxy",
      });
    }
  }

  async proxyRequest(did: string, proxyId: string, url: string) {
    // Make sure the issuer exists
    await this.assertIssuerExists(did);

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
