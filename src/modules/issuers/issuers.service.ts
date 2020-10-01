import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import {
  IssuersListSmartContractResponseObject,
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

  async getIssuer(_did: string): Promise<IssuerResponseObject> {
    const did = _did.toLowerCase();
    const attributesLastHash = await this.tirContract.getIssuer(did);
    if (attributesLastHash.length === 0) {
      throw new NotFoundError("Issuer Not Found", {
        detail: `Issuer ${did} not found`,
      });
    }

    const issuerAttributesData = await Promise.all(
      attributesLastHash.map((hash) => {
        return this.tirContract.getIssuerAttributebyHash(hash);
      })
    );

    const attributes: unknown[] = issuerAttributesData.map(
      (data: { attribData: string }) => {
        const bytes = Buffer.from(data.attribData.slice(2), "hex");
        return JSON.parse(bytes.toString("utf8")) as unknown;
      }
    );

    return { did, attributes };
  }

  getDomain(): string {
    return this.domain;
  }
}
