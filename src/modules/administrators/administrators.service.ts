import { Injectable, Logger } from "@nestjs/common";
import {
  ForbiddenError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import {
  AdministratorResponseObject,
  AttributeObject,
} from "./administrators.interface";
import { ContractService } from "../../shared/services/contract.service";
import { SchemaSCRegistry } from "../../contracts/trusted-schemas";
import { prefixWith0x } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class AdministratorsService {
  private readonly logger = new Logger(AdministratorsService.name);

  constructor(private contractService: ContractService) {}

  async getAdministrators(
    page: number,
    pageSize: number
  ): ReturnType<SchemaSCRegistry["getAdministrators"]> {
    return (await this.contractService.getContract()).getAdministrators(
      page,
      pageSize
    );
  }

  async getAttribute(
    attributeId: string,
    adminDid?: string
  ): Promise<AttributeObject> {
    // If `adminDid` is passed, make sure the admin exists
    if (adminDid) {
      try {
        await (
          await this.contractService.getContract()
        ).getAdministrator(adminDid.toLowerCase());
      } catch (e) {
        throw new NotFoundError("Administrator Not Found", {
          detail: `Administrator ${adminDid} not found`,
        });
      }
    }

    // This function assumes that the attributeId exists
    const hash = prefixWith0x(attributeId);

    let attributeByHash: AsyncReturnType<
      SchemaSCRegistry["getAdministratorAttributeByHash"]
    >;

    try {
      attributeByHash = await (
        await this.contractService.getContract()
      ).getAdministratorAttributeByHash(hash);
    } catch (e) {
      throw new NotFoundError("Attribute Not Found", {
        detail: `Attribute ${hash} not found`,
      });
    }

    // If `adminDid` is passed, make sure the attribute belongs to the given administrator
    if (adminDid && attributeByHash.did !== adminDid.toLowerCase()) {
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
      attributesLastHash = await (
        await this.contractService.getContract()
      ).getAdministrator(did);

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

  async getAdministratorAttributeRevisions(
    attributeId: string,
    adminDid: string,
    page: number,
    pageSize: number
  ): Promise<{ revisions: AttributeObject[]; total: number }> {
    // Make sure the attribute exists and it belongs to the given admin
    await this.getAttribute(attributeId, adminDid.toLowerCase());

    const hash = prefixWith0x(attributeId);
    const revisionHashes = await (
      await this.contractService.getContract()
    ).getAdministratorAttributeRevisions(hash, page, pageSize);

    const revisions = await Promise.all(
      revisionHashes.items.map(async (revisionHash) => {
        return this.getAttribute(revisionHash);
      })
    );

    return { revisions, total: revisionHashes.total.toNumber() };
  }

  async allowAdministratorsOnly(did: string): Promise<void> {
    try {
      await (
        await this.contractService.getContract()
      ).getAdministrator(did.toLowerCase());
    } catch (e) {
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: "JWT subject is not an administrator.",
      });
    }
  }
}
