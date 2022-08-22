import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  BadRequestError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { LedgerService } from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "@ebsiint-sc/timestamp";
import {
  InfoObject,
  RecordResponseObject,
  RecordVersionResponseObject,
} from "./records.interface";
import { multibase } from "../../shared/utils";

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
        const { hashValues, infoIds, total } = await (
          await this.ledgerService.getContract()
        ).getRecordVersion(params[0] as string, params[1] as number, page, 50);
        return { hashValues, infoIds, total };
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
    return (await this.ledgerService.getContract()).getRecordIds(
      page,
      pageSize
    );
  }

  async getRecordIdsByFirstVersionHash(
    firstVersion: string,
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIdsByFirstVersionHash"]> {
    return (
      await this.ledgerService.getContract()
    ).getRecordIdsByFirstVersionHash(firstVersion, page, pageSize);
  }

  async getRecordIdsByOwnerId(
    owner: string,
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIdsByOwnerId"]> {
    return (await this.ledgerService.getContract()).getRecordIdsByOwnerId(
      owner.toLowerCase(),
      page,
      pageSize
    );
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

    const contract = await this.ledgerService.getContract();
    const infosBytes = await Promise.all(
      infoIds.map((infoId) => contract.getRecordVersionInfo(infoId))
    );

    const info: InfoObject[] = infosBytes.map((infoBytes) => {
      const infoString = Buffer.from(infoBytes.slice(2), "hex").toString(
        "utf8"
      );
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
  }
}
