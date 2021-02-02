import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import LedgerService from "../../shared/services/ledger.service";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import { Timestamp } from "../../contracts/timestamp";
import { RecordResponseObject } from "./records.interface";

@Injectable()
export default class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  private timestampContract: Timestamp;

  constructor(
    private ledgerService: LedgerService,
    private configService: ConfigService
  ) {
    this.timestampContract = this.ledgerService.getContract();
  }

  async getRecordIds(
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIds"]> {
    return this.timestampContract.getRecordIds(page, pageSize);
  }

  async getRecordIdsByFirstVersionHash(
    firstVersion: string,
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIdsByFirstVersionHash"]> {
    return this.timestampContract.getRecordIdsByFirstVersionHash(
      firstVersion,
      page,
      pageSize
    );
  }

  async getRecordIdsByOwnerId(
    owner: string,
    page: number,
    pageSize: number
  ): ReturnType<Timestamp["getRecordIdsByOwnerId"]> {
    return this.timestampContract.getRecordIdsByOwnerId(owner, page, pageSize);
  }

  async getAllRecordVersionTimestamps(
    recordId: string,
    versionId: number
  ): Promise<string[]> {
    const {
      hashValues: allHashValues,
      total,
    } = await this.timestampContract.getRecordVersion(
      recordId,
      versionId,
      1,
      50
    );
    const lastPage = Math.ceil(total.toNumber() / 50);
    const promisesNextPages = Array.from(
      { length: lastPage - 1 },
      (x, i) => i + 2
    ).map(async (i) => {
      const { hashValues } = await this.timestampContract.getRecordVersion(
        recordId,
        versionId,
        i,
        50
      );
      return hashValues;
    });
    const otherHashValues = await Promise.all(promisesNextPages);
    otherHashValues.forEach((hashValues) => {
      allHashValues.splice(allHashValues.length, 0, ...hashValues);
    });
    return allHashValues;
  }

  async getRecord(recordId: string): Promise<RecordResponseObject> {
    let record: AsyncReturnType<Timestamp["getRecord"]>;
    try {
      record = await this.timestampContract.getRecord(recordId);
    } catch (error) {
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordId} not found`,
      });
    }

    const { ownerIds, revokedOwnerIds, totalVersions } = record;

    const firstVersionTimestamps = await this.getAllRecordVersionTimestamps(
      recordId,
      0
    );
    const lastVersionTimestamps = await this.getAllRecordVersionTimestamps(
      recordId,
      totalVersions.toNumber() - 1
    );

    return {
      ownerIds,
      revokedOwnerIds,
      firstVersionTimestamps,
      lastVersionTimestamps,
      totalVersions: totalVersions.toNumber(),
    };
  }
}
