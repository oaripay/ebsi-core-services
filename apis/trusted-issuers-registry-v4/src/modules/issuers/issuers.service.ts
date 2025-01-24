import type { Tir } from "@ebsiint-sc/trusted-issuers-registry";

import { EbsiEnvConfiguration } from "@cef-ebsi/verifiable-credential";
import {
  BadRequestError,
  checkStatusList2021Credential,
  InternalServerError,
  isEthersError,
  NotFoundError,
  prefixWith0x,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { Tir__factory } from "@ebsiint-sc/trusted-issuers-registry";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios, { type AxiosResponse } from "axios";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  AttributeObject,
  IssuerProxyResponseObject,
  IssuerResponseObject,
} from "./issuers.interface.js";

import { LedgerService } from "../ledger/ledger.service.js";
import { IssuerTypeNames } from "./issuers.constants.js";

@Injectable()
export class IssuersService {
  private readonly contract: Tir;

  private ebsiEnvConfig: EbsiEnvConfiguration;

  private readonly logger = new Logger(IssuersService.name);

  private readonly timeout: number;

  constructor(
    private ledgerService: LedgerService,
    configService: ConfigService<ApiConfig, true>,
  ) {
    this.ebsiEnvConfig = configService.get("ebsiEnvConfig", { infer: true });
    this.timeout = configService.get("requestTimeout", { infer: true });
    const contractAddress = configService.get(
      "besuTrustedIssuersRegistryAddress",
      { infer: true },
    );
    this.contract = Tir__factory.connect(contractAddress);
  }

  async assertIssuerExists(did: string): Promise<void> {
    const provider = this.ledgerService.getProvider();

    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuer(did);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }
  }

  async didIncludesAttribute(
    did: string,
    attributeId: string,
  ): Promise<boolean> {
    const provider = this.ledgerService.getProvider();

    const attribId = prefixWith0x(attributeId);
    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuer(did);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    if (attributesLastHash.length === 0) {
      return false;
    }

    // /!\ only checks the first 50 revisions of each hash
    // Known issue: if there are more than 50 revisions, didIncludesAttribute may wrongly return false
    try {
      const revisionHashesList = await Promise.all(
        attributesLastHash.map(async (hash) => {
          return (
            this.contract
              // @ts-expect-error Error due to CommonJS vs ESM modules imports
              .connect(provider)
              .getIssuerAttributeRevisions(hash, 1, 50)
          );
        }),
      );

      return !!revisionHashesList.some((revisionHashes) => {
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

  async getAttribute(attributeId: string): Promise<AttributeObject> {
    const provider = this.ledgerService.getProvider();
    const hash = prefixWith0x(attributeId);
    let revisionHashes: Awaited<ReturnType<Tir["getIssuerAttributeRevisions"]>>;
    try {
      // get the first attribute revision
      revisionHashes = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuerAttributeRevisions(hash, 1, 1);

      // use total revisions to get the latest attribute revision
      const totalRevisions = Number(revisionHashes.total);
      revisionHashes = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
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

  async getAttributeRevision(revisionId: string): Promise<AttributeObject> {
    const provider = this.ledgerService.getProvider();

    // This function assumes that the revisionId exists
    const hash = prefixWith0x(revisionId);

    let attributeByHash: Awaited<ReturnType<Tir["getIssuerAttributeByHash"]>>;

    try {
      attributeByHash = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuerAttributeByHash(hash);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${hash} not found`,
      });
    }

    const { attribData, issuerType, rootTao, tao } = attributeByHash;
    const attributeData = Buffer.from(
      remove0xPrefix(attribData),
      "hex",
    ).toString();

    return {
      body: attributeData,
      hash: hash.slice(2),
      issuerType: IssuerTypeNames[Number(issuerType)]!,
      rootTao,
      tao,
    };
  }

  async getAttributes(issuerDid: string): Promise<AttributeObject[]> {
    const provider = this.ledgerService.getProvider();

    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuer(issuerDid);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      } else {
        this.logger.error(error);
      }

      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${issuerDid} not found`,
      });
    }

    if (attributesLastHash.length === 0) {
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

  async getIssuer(did: string): Promise<IssuerResponseObject> {
    const attributes = await this.getAttributes(did);
    return { attributes, did };
  }

  async getIssuerAttributeIdRevisions(
    attributeId: string,
    page: number,
    pageSize: number,
  ): Promise<{ revisions: AttributeObject[]; total: number }> {
    const provider = this.ledgerService.getProvider();

    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    try {
      const revisionHashes = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuerAttributeRevisions(hash, page, pageSize);

      const revisions = await Promise.all(
        revisionHashes.items.map(async (revisionHash) => {
          return this.getAttributeRevision(revisionHash);
        }),
      );

      return { revisions, total: Number(revisionHashes.total) };
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

    const provider = this.ledgerService.getProvider();

    let proxies: Awaited<ReturnType<Tir["getIssuerProxies"]>>;

    try {
      proxies = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuerProxies(did);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
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

    const provider = this.ledgerService.getProvider();

    let proxy: string;
    try {
      proxy = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuerProxyById(did, proxyId);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error, error.stack);
      } else {
        this.logger.error(error);
      }

      throw new InternalServerError();
    }

    // Throw an error if the proxy is empty (i.e. not found)
    if (!proxy) {
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

  async getIssuers(
    page: number,
    pageSize: number,
  ): ReturnType<Tir["getIssuers"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getIssuers(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Failed to get issuers", {
        detail: "Failed to get issuers",
      });
    }
  }

  async proxyRequest(did: string, proxyId: string, url: string) {
    // Make sure the issuer exists
    await this.assertIssuerExists(did);

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
