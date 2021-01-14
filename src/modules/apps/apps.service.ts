import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import { Tar } from "../../contracts/Tar";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { AppResponseObject } from "./apps.interface";

const domainName = ["ebsi", "external"];

@Injectable()
export default class AppsService {
  private readonly logger = new Logger(AppsService.name);

  private tarContract: Tar;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.tarContract = this.ledgerService.getContract();
  }

  async getApps(page: number, pageSize: number): ReturnType<Tar["getApps"]> {
    return this.tarContract.getApps(page, pageSize);
  }

  async getAppByName(name: string): ReturnType<Tar["getAppByName"]> {
    return this.tarContract.getAppByName(name);
  }

  async getAppByPublicKeyId(
    publicKeyId: string
  ): ReturnType<Tar["getAppByPublicKeyId"]> {
    return this.tarContract.getAppByPublicKeyId(publicKeyId);
  }

  async getApp(appId: string): Promise<AppResponseObject> {
    let app: AsyncReturnType<Tar["getAppById"]>;

    try {
      app = await this.tarContract.getAppById(appId);
    } catch (e) {
      throw new NotFoundError("App Not Found", {
        detail: `App ${appId} not found`,
      });
    }

    const [name, domain] = app;

    return {
      id: appId,
      name,
      domain: domainName[domain],
    };
  }
}
