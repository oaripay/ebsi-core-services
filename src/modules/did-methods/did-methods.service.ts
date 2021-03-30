import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { DidMethodResponseObject } from "./did-methods.interface";
import { ContractService } from "../../shared/services/contract.service";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export default class DidMethodsService {
  private readonly logger = new Logger(DidMethodsService.name);

  private didRegistryContract: DidRegistry;

  constructor(private contractService: ContractService) {
    this.didRegistryContract = this.contractService.getContract();
  }

  async getDidMethods(
    page: number,
    pageSize: number
  ): ReturnType<DidRegistry["getDidMethods"]> {
    return this.didRegistryContract.getDidMethods(page, pageSize);
  }

  async getDidMethod(name: string): Promise<DidMethodResponseObject> {
    let method: AsyncReturnType<DidRegistry["getDidMethodByName"]>;

    try {
      method = await this.didRegistryContract.getDidMethodByName(name);
    } catch (e) {
      throw new NotFoundError("DID Method Not Found", {
        detail: `DID Method ${name} not found`,
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
