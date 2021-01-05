import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import {
  AdministratorResponseObject,
  AttributeObject,
} from "./administrators.interface";
import { ApiConfig } from "../../config/configuration";
import LedgerService from "../../shared/services/ledger.service";
import { Tar } from "../../contracts/Tar";
import { prefixWith0x } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class AdministratorsService {
  private readonly logger = new Logger(AdministratorsService.name);

  private tarContract: Tar;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService<ApiConfig>
  ) {
    this.tarContract = this.ledgerService.getContract();
  }

  async getAdministrators(
    page: number,
    pageSize: number
  ): ReturnType<Tar["getAdministrators"]> {
    return this.tarContract.getAdministrators(page, pageSize);
  }

  async getAttribute(
    attributeId: string,
    adminDid?: string
  ): Promise<AttributeObject> {
    // If `adminDid` is passed, make sure the admin exists
    if (adminDid) {
      try {
        await this.tarContract.getAdministrator(adminDid);
      } catch (e) {
        throw new NotFoundError("Administrator Not Found", {
          detail: `Administrator ${adminDid} not found`,
        });
      }
    }

    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    let attributeByHash: AsyncReturnType<
      Tar["getAdministratorAttributeByHash"]
    >;

    try {
      attributeByHash = await this.tarContract.getAdministratorAttributeByHash(
        hash
      );
    } catch (e) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} not found`,
      });
    }

    // If `adminDid` is passed, make sure the attribute belongs to the given administrator
    if (adminDid && attributeByHash.did !== adminDid) {
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
      attributesLastHash = await this.tarContract.getAdministrator(did);

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
}
