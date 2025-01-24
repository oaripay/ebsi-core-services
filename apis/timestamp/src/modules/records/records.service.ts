import type { Timestamp } from "@ebsiint-sc/timestamp";

import {
  BadRequestError,
  getErrorMessage,
  isEthersError,
  multibase,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { Timestamp__factory } from "@ebsiint-sc/timestamp";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ethers } from "ethers";

import type { ApiConfig } from "../../config/configuration.js";
import type {
  InfoObject,
  RecordResponseObject,
  RecordVersionResponseObject,
} from "./records.interface.js";

import { LedgerService } from "../ledger/ledger.service.js";

@Injectable()
export default class RecordsService {
  private readonly contract: Timestamp;

  private readonly logger = new Logger(RecordsService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    const contractAddress = configService.get("contractAddr", {
      infer: true,
    });
    this.contract = Timestamp__factory.connect(contractAddress);
  }

  async getAllPages(
    fnName: string,
    params: (number | string)[],
  ): Promise<{
    hashValues: string[];
    infoIds: string[];
    totalHashes: number;
  }> {
    const { hashValues, infoIds, total } = await this.getPage(
      fnName,
      params,
      1,
    );
    const totalNumber = Number(BigInt(total));
    const lastPage = Math.ceil(totalNumber / 50);
    const promisesNextPages = Array.from(
      { length: lastPage - 1 },
      (_, i) => i + 2,
    ).map(async (i) => {
      const { hashValues: pagItems } = await this.getPage(fnName, params, i);
      return pagItems;
    });
    const hashValuesNextPages = await Promise.all(promisesNextPages);
    for (const pagItems of hashValuesNextPages) {
      hashValues.splice(hashValues.length, 0, ...pagItems);
    }
    return { hashValues, infoIds, totalHashes: totalNumber };
  }

  async getPage(
    fnName: string,
    params: (number | string)[],
    page: number,
  ): Promise<{
    hashValues: string[];
    infoIds: string[];
    total: ethers.BigNumberish;
  }> {
    switch (fnName) {
      case "getRecordVersion": {
        const provider = this.ledgerService.getProvider();

        try {
          const { hashValues, infoIds, total } = await this.contract
            // @ts-expect-error Error due to contracts using CommonJS modules
            .connect(provider)
            .getRecordVersion(
              params[0] as string,
              params[1] as number,
              page,
              50,
            );
          return { hashValues, infoIds, total };
        } catch (error) {
          if (isEthersError(error)) {
            this.logger.error(error, error.stack);
          }
          throw new NotFoundError("Record Not Found", {
            detail: "Record not found",
          });
        }
      }
      default: {
        throw new Error(`Timestamp function ${fnName} not implemented`);
      }
    }
  }

  async getRecord(recordIdEncoded: string): Promise<RecordResponseObject> {
    let record: Awaited<ReturnType<Timestamp["getRecord"]>>;
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded),
    ).toString("hex")}`;

    const provider = this.ledgerService.getProvider();

    try {
      record = await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
        .getRecord(recordId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    const { ownerIds, revokedOwnerIds, totalVersions } = record;

    const { hashValues: firstVersionTimestamps } = await this.getAllPages(
      "getRecordVersion",
      [recordId, 0],
    );

    const { hashValues: lastVersionTimestamps } = await this.getAllPages(
      "getRecordVersion",
      [recordId, Number(totalVersions) - 1],
    );

    return {
      firstVersionTimestamps,
      lastVersionTimestamps,
      ownerIds,
      revokedOwnerIds,
      totalVersions: Number(totalVersions),
    };
  }

  async getRecordIds(
    page: number,
    pageSize: number,
  ): ReturnType<Timestamp["getRecordIds"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
        .getRecordIds(page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new BadRequestError("Invalid page or pageSize", {
        detail: "Invalid page or pageSize",
      });
    }
  }

  async getRecordIdsByFirstVersionHash(
    firstVersion: string,
    page: number,
    pageSize: number,
  ): ReturnType<Timestamp["getRecordIdsByFirstVersionHash"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
        .getRecordIdsByFirstVersionHash(firstVersion, page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new BadRequestError("Invalid firstVersion, page or pageSize", {
        detail: "Invalid firstVersion, page or pageSize",
      });
    }
  }

  async getRecordIdsByOwnerId(
    owner: string,
    page: number,
    pageSize: number,
  ): ReturnType<Timestamp["getRecordIdsByOwnerId"]> {
    const provider = this.ledgerService.getProvider();

    try {
      return await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
        .getRecordIdsByOwnerId(owner.toLowerCase(), page, pageSize);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new BadRequestError("Invalid owner, page or pageSize", {
        detail: "Invalid owner, page or pageSize",
      });
    }
  }

  async getRecordVersion(
    recordIdEncoded: string,
    versionId: string,
  ): Promise<RecordVersionResponseObject> {
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded),
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

    const provider = this.ledgerService.getProvider();

    try {
      const contract = this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider);
      const infosBytes = await Promise.all(
        infoIds.map((infoId) => contract.getRecordVersionInfo(infoId)),
      );

      const info: InfoObject[] = infosBytes.map((infoBytes) => {
        const infoString = Buffer.from(
          remove0xPrefix(infoBytes),
          "hex",
        ).toString("utf8");
        try {
          return JSON.parse(infoString) as InfoObject;
        } catch {
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
        this.logger.error(error, error.stack);
      }
      throw new Error(getErrorMessage(error));
    }
  }

  async getRecordVersions(recordIdEncoded: string): Promise<number> {
    let record: Awaited<ReturnType<Timestamp["getRecord"]>>;

    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded),
    ).toString("hex")}`;

    const provider = this.ledgerService.getProvider();

    try {
      record = await this.contract
        // @ts-expect-error Error due to contracts using CommonJS modules
        .connect(provider)
        .getRecord(recordId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    return Number(record.totalVersions);
  }
}
