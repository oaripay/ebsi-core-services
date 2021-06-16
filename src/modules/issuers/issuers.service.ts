import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { LedgerService } from "../../shared/services/ledger.service";
import { AttributeObject, IssuerResponseObject } from "./issuers.interface";
import { Tir } from "../../contracts";
import { prefixWith0x } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  constructor(private ledgerService: LedgerService) {}

  async getIssuers(
    page: number,
    pageSize: number
  ): ReturnType<Tir["getIssuers"]> {
    return (await this.ledgerService.getContract()).getIssuers(page, pageSize);
  }

  async getAttribute(attributeId: string): Promise<AttributeObject> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    let attributeByHash: AsyncReturnType<Tir["getIssuerAttributeByHash"]>;

    try {
      attributeByHash = await (
        await this.ledgerService.getContract()
      ).getIssuerAttributeByHash(hash);
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

  async getAttributes(issuerDid: string): Promise<AttributeObject[]> {
    const did = issuerDid.toLowerCase();

    let attributesLastHash: string[];

    try {
      attributesLastHash = await (
        await this.ledgerService.getContract()
      ).getIssuer(did);

      if (attributesLastHash.length === 0) {
        throw new Error();
      }
    } catch (e) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${issuerDid} not found`,
      });
    }

    return Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.getAttribute(hash);
      })
    );
  }

  async getIssuer(did: string): Promise<IssuerResponseObject> {
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
      attributesLastHash = await (
        await this.ledgerService.getContract()
      ).getIssuer(did.toLowerCase());
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
        return (
          await this.ledgerService.getContract()
        ).getIssuerAttributeRevisions(hash, 1, 50);
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

    const revisionHashes = await (
      await this.ledgerService.getContract()
    ).getIssuerAttributeRevisions(hash, page, pageSize);

    const revisions = await Promise.all(
      revisionHashes.items.map(async (revisionHash) => {
        return this.getAttribute(revisionHash);
      })
    );

    return { revisions, total: revisionHashes.total.toNumber() };
  }
}

export default IssuersService;
