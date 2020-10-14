import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import {
  IssuersListSmartContractResponseObject,
  AttributeObject,
  IssuerResponseObject,
} from "./types/issuers.interface";
import TrustedIssuersRegistryContract from "../../shared/types/trusted-issuers-registry.interface";

@Injectable()
export default class IssuersService {
  private readonly logger = new Logger(IssuersService.name);

  private tirContract: TrustedIssuersRegistryContract;

  private domain: string;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tirContract = (this.ledgerService.getContract() as unknown) as TrustedIssuersRegistryContract;
    this.domain = this.configService.get<string>("domain");
  }

  getDomain(): string {
    return this.domain;
  }

  async getIssuers(
    page: number,
    howMany: number
  ): Promise<IssuersListSmartContractResponseObject> {
    try {
      return await this.tirContract.getIssuers(page, howMany);
    } catch (error) {
      if ((error as Error).message.includes("PageSize should")) {
        throw new BadRequestError("Bad Paging Request", {
          detail: (error as Error).message,
        });
      }
      throw error;
    }
  }

  async getAttributeId(attributeId: string): Promise<AttributeObject> {
    // This function assumes that the attributeId exists
    const { attribData } = await this.tirContract.getIssuerAttributebyHash(
      attributeId
    );
    const bufferAttribute = Buffer.from(attribData.slice(2), "hex");
    const attributeBase64 = bufferAttribute.toString("base64");

    return {
      hash: attributeId,
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
        return this.getAttributeId(hash);
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
    const attributesLastHash = await this.tirContract.getIssuer(did);
    if (attributesLastHash.length === 0) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }
    const ListRevisionHashes = await Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.tirContract.getIssuerAttributeHistory(hash);
      })
    );
    return !!ListRevisionHashes.find((revisionHashes) => {
      return revisionHashes.find((hash) => hash === attributeId);
    });
  }
}
