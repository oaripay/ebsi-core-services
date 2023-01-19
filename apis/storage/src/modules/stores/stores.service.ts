import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@ebsiint-api/shared";
import { STORES } from "./stores.constants";

@Injectable()
export class StoresService {
  getStores(pageAfter: number, pageSize: number): string[] {
    return STORES.slice(pageAfter - 1, pageAfter + pageSize - 1);
  }

  getStore(store: string): void {
    if (!STORES.includes(store as (typeof STORES)[number])) {
      throw new NotFoundError(NotFoundError.defaultTitle, {
        detail: `Store "${store}" does not exist.`,
      });
    }
  }
}

export default { StoresService };
