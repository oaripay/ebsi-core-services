import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { LedgerSCRegistry } from "@ebsiint-sc/trusted-ledgers-sc-registry";
import { AsyncReturnType } from "@ebsiint-api/shared";
import { ContractService } from "../contract/contract.service";
import {
  SmartContractInfoIdsList,
  RevisionsList,
} from "./smart-contracts.interface";

@Injectable()
export class SmartContractsService {
  private readonly logger = new Logger(SmartContractsService.name);

  constructor(private contractService: ContractService) {}

  async getSmartContracts(
    page: number,
    pageSize: number,
    name?: string
  ): Promise<SmartContractInfoIdsList> {
    if (name) {
      try {
        const smartContract = await (
          await this.contractService.getContract()
        ).getSmartContractInfoIdByName(name);

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

    const result = await (
      await this.contractService.getContract()
    ).getSmartContractInfoIds(page, pageSize);

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
      smartContractInfo = await (
        await this.contractService.getContract()
      ).getLatestSmartContractInfoById(smartContractInfoId);
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

  async getSmartContractRevisions(
    smartContractInfoId: string,
    page: number,
    pageSize: number
  ): Promise<RevisionsList> {
    try {
      await (
        await this.contractService.getContract()
      ).getLatestSmartContractInfoById(smartContractInfoId);
    } catch (error) {
      throw new NotFoundError("Smart Contract Not Found", {
        detail: `Smart contract ${smartContractInfoId} not found`,
      });
    }

    const result = await (
      await this.contractService.getContract()
    ).getSmartContractInfoRevisionIds(smartContractInfoId, page, pageSize);

    return {
      items: result.items,
      total: result.total.toNumber(),
    };
  }

  async getSmartContractRevision(
    smartContractInfoId: string,
    revisionHash: string
  ): Promise<unknown> {
    // Make sure it exists
    try {
      await (
        await this.contractService.getContract()
      ).getLatestSmartContractInfoById(smartContractInfoId);
    } catch (error) {
      throw new NotFoundError("Smart Contract Not Found", {
        detail: `Smart contract ${smartContractInfoId} not found`,
      });
    }

    let smartContractInfo: AsyncReturnType<
      LedgerSCRegistry["getSmartContractInfoByRevisionId"]
    >;

    try {
      smartContractInfo = await (
        await this.contractService.getContract()
      ).getSmartContractInfoByRevisionId(revisionHash);

      if (!smartContractInfo || smartContractInfo === "0x") {
        throw new Error("not found");
      }
    } catch (error) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${revisionHash} not found`,
      });
    }

    const decodedSmartContractInfo = JSON.parse(
      Buffer.from(smartContractInfo.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedSmartContractInfo;
  }
}

export default SmartContractsService;
