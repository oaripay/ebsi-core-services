import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import { Timestamp } from "@ebsiint-sc/timestamp-v2";
import {
  AsyncReturnType,
  multibase,
  BadRequestError,
  NotFoundError,
  isEthersError,
  remove0xPrefix,
  getErrorMessage,
} from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service";
import {
  InfoObject,
  RecordResponseObject,
  RecordVersionResponseObject,
} from "./records.interface";

@Injectable()
export default class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getPage(
    fnName: string,
    params: (string | number)[],
    page: number
  ): Promise<{
    hashValues: string[];
    infoIds: string[];
    total: ethers.BigNumber;
  }> {
    switch (fnName) {
      case "getRecordVersion": {
        try {
          const { hashValues, infoIds, total } = await (
            await this.ledgerService.getContract()
          ).getRecordVersion(
            params[0] as string,
            params[1] as number,
            page,
            50
          );
          return { hashValues, infoIds, total };
        } catch (error) {
          if (isEthersError(error)) {
            this.logger.error(error);
          }
          throw new NotFoundError("Record Not Found", {
            detail: "Record not found",
          });
        }
      }
      default:
        throw new Error(`Timestamp function ${fnName} not implemented`);
    }
  }

  async getAllPages(
    fnName: string,
    params: (string | number)[]
  ): Promise<{
    hashValues: string[];
    infoIds: string[];
    totalHashes: number;
  }> {
    const { hashValues, infoIds, total } = await this.getPage(
      fnName,
      params,
      1
    );
    const lastPage = Math.ceil(total.toNumber() / 50);
    const promisesNextPages = Array.from(
      { length: lastPage - 1 },
      (x, i) => i + 2
    ).map(async (i) => {
      const { hashValues: pagItems } = await this.getPage(fnName, params, i);
      return pagItems;
    });
    const hashValuesNextPages = await Promise.all(promisesNextPages);
    hashValuesNextPages.forEach((pagItems) => {
      hashValues.splice(hashValues.length, 0, ...pagItems);
    });
    return { hashValues, infoIds, totalHashes: total.toNumber() };
  }

  async getRecordIds(
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIds"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getRecordIds(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new BadRequestError("Invalid page or pageSize", {
        detail: "Invalid page or pageSize",
      });
    }
  }

  async getRecordIdsByFirstVersionHash(
    firstVersion: string,
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIdsByFirstVersionHash"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getRecordIdsByFirstVersionHash(firstVersion, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new BadRequestError("Invalid firstVersion, page or pageSize", {
        detail: "Invalid firstVersion, page or pageSize",
      });
    }
  }

  async getRecordIdsByOwnerId(
    owner: string,
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIdsByOwnerId"]> {
    try {
      return await (
        await this.ledgerService.getContract()
      ).getRecordIdsByOwnerId(owner.toLowerCase(), page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new BadRequestError("Invalid owner, page or pageSize", {
        detail: "Invalid owner, page or pageSize",
      });
    }
  }

  async getRecord(recordIdEncoded: string): Promise<RecordResponseObject> {
    let record: AsyncReturnType<Timestamp["getRecord"]>;
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded)
    ).toString("hex")}`;

    try {
      record = await (
        await this.ledgerService.getContract()
      ).getRecord(recordId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    const { ownerIds, revokedOwnerIds, totalVersions } = record;

    const { hashValues: firstVersionTimestamps } = await this.getAllPages(
      "getRecordVersion",
      [recordId, 0]
    );

    const { hashValues: lastVersionTimestamps } = await this.getAllPages(
      "getRecordVersion",
      [recordId, totalVersions.toNumber() - 1]
    );

    return {
      ownerIds,
      revokedOwnerIds,
      firstVersionTimestamps,
      lastVersionTimestamps,
      totalVersions: totalVersions.toNumber(),
    };
  }

  async getRecordVersions(recordIdEncoded: string): Promise<number> {
    let record: AsyncReturnType<Timestamp["getRecord"]>;
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded)
    ).toString("hex")}`;

    try {
      record = await (
        await this.ledgerService.getContract()
      ).getRecord(recordId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    return record.totalVersions.toNumber();
  }

  async getRecordVersion(
    recordIdEncoded: string,
    versionId: string
  ): Promise<RecordVersionResponseObject> {
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded)
    ).toString("hex")}`;

    const totalVersions = await this.getRecordVersions(recordIdEncoded);

    if (Number(versionId) >= totalVersions) {
      throw new NotFoundError("Version Not Found", {
        detail: `Version ${versionId} not found`,
      });
    }

    const { hashValues, infoIds } = await this.getAllPages("getRecordVersion", [
      recordId,
      Number(versionId),
    ]);

    try {
      const contract = await this.ledgerService.getContract();
      const infosBytes = await Promise.all(
        infoIds.map((infoId) => contract.getRecordVersionInfo(infoId))
      );

      const info: InfoObject[] = infosBytes.map((infoBytes) => {
        const infoString = Buffer.from(
          remove0xPrefix(infoBytes),
          "hex"
        ).toString("utf8");
        try {
          return JSON.parse(infoString) as InfoObject;
        } catch (error) {
          throw new BadRequestError("Info can not be parsed", {
            detail: `The info related to this versionId can not be parsed to JSON. infoBytes: ${infoBytes}`,
          });
        }
      });

      return {
        hashes: hashValues,
        info,
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new Error(getErrorMessage(error));
    }
  }
}
