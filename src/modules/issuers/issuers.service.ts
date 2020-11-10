import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import { AttributeObject, IssuerResponseObject } from "./issuers.interface";
import { TrustedIssuersRegistryContract } from "../../shared/types/trusted-issuers-registry.interface";
import { prefixWith0x } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  private tirContract: TrustedIssuersRegistryContract;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tirContract = (this.ledgerService.getContract() as unknown) as TrustedIssuersRegistryContract;
  }

  async getIssuers(
    page: number,
    pageSize: number
  ): ReturnType<TrustedIssuersRegistryContract["getIssuers"]> {
    return this.tirContract.getIssuers(page, pageSize);
  }

  async getAttribute(attributeId: string): Promise<AttributeObject> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    let attributeByHash: AsyncReturnType<
      TrustedIssuersRegistryContract["getIssuerAttributeByHash"]
    >;

    try {
      attributeByHash = await this.tirContract.getIssuerAttributeByHash(hash);
    } catch (e) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} not found`,
      });
    }

    const { attribData } = attributeByHash;

    const bufferAttribute = Buffer.from(attribData.slice(2), "hex");
    const attributeBase64 = bufferAttribute.toString("base64");

    return {
      hash: hash.slice(2),
      body: attributeBase64,
    };
  }

  async getAttributes(_did: string): Promise<AttributeObject[]> {
    const did = _did.toLowerCase();

    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.tirContract.getIssuer(did);

      if (attributesLastHash.length === 0) {
        throw new Error();
      }
    } catch (e) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    return Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.getAttribute(hash);
      })
    );
  }

  async getIssuer(_did: string): Promise<IssuerResponseObject> {
    const did = _did.toLowerCase();
    const attributes = await this.getAttributes(did);
    return { did, attributes };
  }

  async didIncludesAttribute(
    did: string,
    attributeId: string
  ): Promise<boolean> {
    const attribId = prefixWith0x(attributeId);
    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.tirContract.getIssuer(did);
    } catch (e) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    if (attributesLastHash.length === 0) {
      throw new Error();
    }

    // /!\ only checks the first 50 revisions of each hash
    // Known issue: if there are more than 50 revisions, didIncludesAttribute may wrongly return false
    const revisionHashesList = await Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.tirContract.getIssuerAttributeRevisions(hash, 1, 50);
      })
    );

    return !!revisionHashesList.find((revisionHashes) => {
      return revisionHashes.items.find((hash) => hash === attribId);
    });
  }

  async getIssuerAttributeIdRevisions(
    attributeId: string,
    page: number,
    pageSize: number
  ): Promise<{ revisions: AttributeObject[]; total: number }> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    const revisionHashes = await this.tirContract.getIssuerAttributeRevisions(
      hash,
      page,
      pageSize
    );

    const revisions = await Promise.all(
      revisionHashes.items.map(async (revisionHash) => {
        return this.getAttribute(revisionHash);
      })
    );

    return { revisions, total: revisionHashes.total.toNumber() };
  }
}
