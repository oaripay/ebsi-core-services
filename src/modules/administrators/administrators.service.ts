import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import {
  AttributeObject,
  AdministratorResponseObject,
} from "./administrators.interface";
import { TrustedIssuersRegistryContract } from "../../shared/types/trusted-issuers-registry.interface";
import { prefixWith0x } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class AdministratorsService {
  private readonly logger = new Logger(AdministratorsService.name);

  private tirContract: TrustedIssuersRegistryContract;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tirContract = (this.ledgerService.getContract() as unknown) as TrustedIssuersRegistryContract;
  }

  async getAdministrators(
    page: number,
    pageSize: number
  ): ReturnType<TrustedIssuersRegistryContract["getAdministrators"]> {
    return this.tirContract.getAdministrators(page, pageSize);
  }

  async getAttribute(attributeId: string): Promise<AttributeObject> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    let attributeByHash: AsyncReturnType<
      TrustedIssuersRegistryContract["getAdministratorAttributeByHash"]
    >;

    try {
      attributeByHash = await this.tirContract.getAdministratorAttributeByHash(
        hash
      );
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

  async getAttributes(administratorDid: string): Promise<AttributeObject[]> {
    const did = administratorDid.toLowerCase();

    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.tirContract.getAdministrator(did);

      if (attributesLastHash.length === 0) {
        throw new Error();
      }
    } catch (e) {
      throw new NotFoundError("Administrator Not Found", {
        detail: `Administrator ${did} not found`,
      });
    }

    return Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.getAttribute(hash);
      })
    );
  }

  async getAdministrator(
    administratorDid: string
  ): Promise<AdministratorResponseObject> {
    const did = administratorDid.toLowerCase();
    const attributes = await this.getAttributes(did);
    return { did, attributes };
  }

  async didIncludesAttribute(
    administratorDid: string,
    attributeId: string
  ): Promise<boolean> {
    const attribId = prefixWith0x(attributeId);
    let attributesLastHash: string[];

    try {
      attributesLastHash = await this.tirContract.getAdministrator(
        administratorDid
      );
    } catch (e) {
      throw new NotFoundError("Administrator Not Found", {
        detail: `Administrator ${administratorDid} not found`,
      });
    }

    if (attributesLastHash.length === 0) {
      return false;
    }

    // /!\ only checks the first 50 revisions of each hash
    // Known issue: if there are more than 50 revisions, didIncludesAttribute may wrongly return false
    const revisionHashesList = await Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.tirContract.getAdministratorAttributeRevisions(hash, 1, 50);
      })
    );

    return !!revisionHashesList.find((revisionHashes) => {
      return revisionHashes.items.find((hash) => hash === attribId);
    });
  }

  async getAdministratorAttributeRevisions(
    attributeId: string,
    page: number,
    pageSize: number
  ): Promise<{ revisions: AttributeObject[]; total: number }> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);
    const revisionHashes = await this.tirContract.getAdministratorAttributeRevisions(
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
