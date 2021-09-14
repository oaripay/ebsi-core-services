import { Injectable, Logger } from "@nestjs/common";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "@cef-ebsi/problem-details-errors";
import { isISO8601 } from "class-validator";
import {
  AdministratorResponseObject,
  AttributeObject,
} from "./administrators.interface";
import { LedgerService } from "../ledger/ledger.service";
import { DidRegistry } from "../../contracts/did-registry";
import { prefixWith0x } from "../../shared/utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export class AdministratorsService {
  private readonly logger = new Logger(AdministratorsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getAdministrators(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getAdministrators"]> {
    return (await this.ledgerService.getContract()).getAdministrators(
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
          await this.ledgerService.getContract()
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
      DidRegistry["getAdministratorAttributeByHash"]
    >;

    try {
      attributeByHash = await (
        await this.ledgerService.getContract()
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
        await this.ledgerService.getContract()
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
      await this.ledgerService.getContract()
    ).getAdministratorAttributeRevisions(hash, page, pageSize);

    const revisions = await Promise.all(
      revisionHashes.items.map(async (revisionHash) => {
        return this.getAttribute(revisionHash);
      })
    );

    return { revisions, total: revisionHashes.total.toNumber() };
  }

  async allowAdministratorsOnly(did: string): Promise<void> {
    let admin: AdministratorResponseObject;
    try {
      admin = await this.getAdministrator(did);
    } catch (e) {
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: `${did} is not an administrator`,
      });
    }

    const firstAttributeString = Buffer.from(
      admin.attributes[0].body,
      "base64"
    ).toString();
    let attribute: {
      validFrom: string;
      validTo: string;
    };

    try {
      attribute = JSON.parse(firstAttributeString) as {
        validFrom: string;
        validTo: string;
      };
    } catch (error) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail: `Administrator ${did} does not contain a valid JSON in the first attribute`,
      });
    }

    const { validFrom, validTo } = attribute;
    const now = new Date();
    if (
      !isISO8601(validFrom) ||
      new Date(validFrom) > now ||
      (validTo && (!isISO8601(validTo) || new Date(validTo) < now))
    )
      throw new ForbiddenError(ForbiddenError.defaultTitle, {
        detail: `Administrator ${did} is disabled`,
      });
  }
}

export default AdministratorsService;
