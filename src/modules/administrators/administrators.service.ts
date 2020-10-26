import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import {
  AdministratorsListSmartContractResponseObject,
  AttributeObject,
  AdministratorResponseObject,
} from "./administrators.interface";
import TrustedIssuersRegistryContract from "../../shared/types/trusted-issuers-registry.interface";
import { prefixWith0x } from "../../shared/utils";

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
  ): Promise<AdministratorsListSmartContractResponseObject> {
    // TODO: currently, the SC is 0-based
    // Remove this fix when the SC is updated
    const scPage = page - 1;
    return this.tirContract.getAdministrators(scPage, pageSize);
  }

  async getAttribute(attributeId: string): Promise<AttributeObject> {
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
        return this.getAttribute(hash);
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

    const revisionHashesList = await Promise.all(
      attributesLastHash.map(async (hash) => {
        return this.tirContract.getAdministratorAttributeHistory(hash);
      })
    );

    return !!revisionHashesList.find((revisionHashes) => {
      return revisionHashes.find((hash) => hash === attributeId);
    });
  }

  async getAdministratorAttributeRevisions(
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
