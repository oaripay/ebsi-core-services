import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ApiConfig } from "../../config/configuration";
import { STORES } from "./stores.constants";
@Injectable()
export class StoresService {
  private readonly logger = new Logger(StoresService.name);

  constructor(private configService: ConfigService<ApiConfig>) {}

  getStores(pageAfter: number, pageSize: number): string[] {
    return STORES.slice(pageAfter - 1, pageAfter + pageSize - 1);
  }

  getStore(store: string): void {
    if (!STORES.includes(store as typeof STORES[number])) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: `Store "${store}" does not exist.`,
      });
    }
  }
}

export default { StoresService };
