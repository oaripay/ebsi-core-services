import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import {
  IssuersListSmartContractResponseObject,
  AttributeObject,
  IssuerResponseObject,
} from "./issuers.interface";
import TrustedIssuersRegistryContract from "../../shared/types/trusted-issuers-registry.interface";
import { prefixWith0x } from "../../shared/utils";

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
  ): Promise<IssuersListSmartContractResponseObject> {
    // TODO: currently, the SC is 0-based
    // Remove this fix when the SC is updated
    const scPage = page - 1;
    return this.tirContract.getIssuers(scPage, pageSize);
  }

  async getAttribute(attributeId: string): Promise<AttributeObject> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);
    const { attribData } = await this.tirContract.getIssuerAttributebyHash(
      hash
    );
    const bufferAttribute = Buffer.from(attribData.slice(2), "hex");
    const attributeBase64 = bufferAttribute.toString("base64");

    return {
      hash: hash.slice(2),
      body: attributeBase64,
    };
  }

  async getAttributes(_did: string): Promise<AttributeObject[]> {
    const did = _did.toLowerCase();
    const attributesLastHash = await this.tirContract.getIssuer(did);

    if (attributesLastHash.length === 0) {
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
    const attributesLastHash = await this.tirContract.getIssuer(did);

    if (attributesLastHash.length === 0) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }
    const revisionHashesList = await Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.tirContract.getIssuerAttributeHistory(hash);
      })
    );
    return !!revisionHashesList.find((revisionHashes) => {
      return revisionHashes.find((hash) => hash === attribId);
    });
  }

  async getIssuerAttributeIdRevisions(
    attributeId: string
  ): Promise<AttributeObject[]> {
    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);
    const revisionHashes = await this.tirContract.getIssuerAttributeHistory(
      hash
    );
    return Promise.all(
      revisionHashes.map(async (revisionHash) => {
        return this.getAttribute(revisionHash);
      })
    );
  }
}
