import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { DidMethodResponseObject } from "./did-methods.interface";
import { LedgerService } from "../ledger/ledger.service";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class DidMethodsService {
  private readonly logger = new Logger(DidMethodsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getDidMethods(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getDidMethods"]> {
    return (await this.ledgerService.getContract()).getDidMethods(
      page,
      pageSize
    );
  }

  async getDidMethod(name: string): Promise<DidMethodResponseObject> {
    let method: AsyncReturnType<DidRegistry["getDidMethodByName"]>;

    try {
      method = await (
        await this.ledgerService.getContract()
      ).getDidMethodByName(name.toLowerCase());
    } catch (e) {
      throw new NotFoundError("DID Method Not Found", {
        detail: `DID Method ${name.toLowerCase()} not found`,
      });
    }

    return {
      methodName: method.methodName,
      ledgerName: method.ledgerName,
      methodSpec: method.methodSpec,
      methodSpecHash: method.methodSpecHash,
      notBefore: method.notBefore.toNumber(),
      notAfter: method.notAfter.toNumber(),
      status: method.status,
    };
  }
}
