import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import {
  AdministratorsListSmartContractResponseObject,
  AttributeObject,
  AdministratorResponseObject,
} from "./types/administrators.interface";
import TrustedIssuersRegistryContract from "../../shared/types/trusted-issuers-registry.interface";

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
    howMany: number
  ): Promise<AdministratorsListSmartContractResponseObject> {
    try {
      return await this.tirContract.getAdministrators(page, howMany);
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
    const {
      attribData,
    } = await this.tirContract.getAdministratorAttributebyHash(attributeId);
    const bufferAttribute = Buffer.from(attribData.slice(2), "hex");
    const attributeBase64 = bufferAttribute.toString("base64");

    return {
      hash: attributeId,
      body: attributeBase64,
    };
  }

  async getAttributes(_did: string): Promise<AttributeObject[]> {
    const did = _did.toLowerCase();
    const attributesLastHash = await this.tirContract.getAdministrator(did);
    if (attributesLastHash.length === 0) {
      throw new NotFoundError("Administrator Not Found", {
        detail: `Administrator ${did} not found`,
      });
    }

    return Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.getAttributeId(hash);
      })
    );
  }

  async getAdministrator(_did: string): Promise<AdministratorResponseObject> {
    const did = _did.toLowerCase();
    const attributes = await this.getAttributes(did);
    return { did, attributes };
  }

  async didIncludesAttribute(
    did: string,
    attributeId: string
  ): Promise<boolean> {
    const attributesLastHash = await this.tirContract.getAdministrator(did);
    if (attributesLastHash.length === 0) {
      throw new NotFoundError("Administrator Not Found", {
        detail: `Administrator ${did} not found`,
      });
    }
    const ListRevisionHashes = await Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.tirContract.getAdministratorAttributeHistory(hash);
      })
    );
    return !!ListRevisionHashes.find((revisionHashes) => {
      return revisionHashes.find((hash) => hash === attributeId);
    });
  }
}
