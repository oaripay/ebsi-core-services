import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { LedgerSCRegistry } from "../../contracts/trusted-ledgers-sc";
import { SmartContractInfoIdsList } from "./smart-contracts.interface";

@Injectable()
export class SmartContractsService {
  private readonly logger = new Logger(SmartContractsService.name);

  private ledgerScRegistryContract: LedgerSCRegistry;

  constructor(private contractService: ContractService) {
    this.ledgerScRegistryContract = this.contractService.getContract();
  }

  async getSmartContracts(
    page: number,
    pageSize: number,
    name?: string
  ): Promise<SmartContractInfoIdsList> {
    if (name) {
      try {
        const smartContract = await this.ledgerScRegistryContract.getSmartContractInfoIdByName(
          name
        );

        return {
          items: [smartContract],
          total: smartContract ? 1 : 0,
        };
      } catch (e) {
        return {
          items: [],
          total: 0,
        };
      }
    }

    const result = await this.ledgerScRegistryContract.getSmartContractInfoIds(
      page,
      pageSize
    );

    return {
      items: result.items,
      total: result.total.toNumber(),
    };
  }

  async getSmartContract(smartContractInfoId: string): Promise<unknown> {
    let smartContractInfo: AsyncReturnType<
      LedgerSCRegistry["getLatestSmartContractInfoById"]
    >;

    try {
      smartContractInfo = await this.ledgerScRegistryContract.getLatestSmartContractInfoById(
        smartContractInfoId
      );
    } catch (error) {
      throw new NotFoundError("Smart Contract Not Found", {
        detail: `Smart contract ${smartContractInfoId} not found`,
      });
    }

    const decodedSmartContractInfo = JSON.parse(
      Buffer.from(smartContractInfo.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedSmartContractInfo;
  }
}

export default SmartContractsService;
