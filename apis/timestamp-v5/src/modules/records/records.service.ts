import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";
import {
  multibase,
  BadRequestError,
  NotFoundError,
  InternalServerError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import {
  InfoObject,
  RecordResponseObject,
  RecordVersionResponseObject,
} from "./records.interface.js";
import {
  getBuiltGraphSDK,
  GetRecordsQuery,
  GetTimestampRecordIdsFirstVersionQuery,
  GetOwnerQuery,
  GetRecordQuery,
  GetRecordVersionQuery,
  GetRecordVersionsQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  async getRecordIds(
    page: number,
    pagesize: number,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetRecordsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetRecords({ skip, pagesize: queryPageSize });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const items = res.records.map((r) => r.id);
    return { items };
  }

  async getRecordIdsByFirstVersionHash(
    firstVersion: string,
    page: number,
    pagesize: number,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetTimestampRecordIdsFirstVersionQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      const timestampId = ethers.utils.sha256(firstVersion);
      res = await sdk.GetTimestampRecordIdsFirstVersion({
        skip,
        pagesize: queryPageSize,
        timestampId,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const ids = res.timestampSet.recordIdsFirstVersion;
    return { items: ids };
  }

  async getRecordIdsByOwnerId(
    owner: string,
    page: number,
    pagesize: number,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetOwnerQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetOwner({ skip, pagesize: queryPageSize, id: owner });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.owner) {
      return { items: [] };
    }

    return { items: res.owner.recordIds };
  }

  async getRecord(recordIdEncoded: string): Promise<RecordResponseObject> {
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded),
    ).toString("hex")}`;

    let res: GetRecordQuery;

    try {
      res = await sdk.GetRecord({ recordId });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.record) {
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const ownerIds = res.record.owners
      .filter((o) => now >= Number(o.notBefore) && now <= Number(o.notAfter))
      .map((o) => o.id);
    const revokedOwnerIds = res.record.owners
      .filter((o) => now > Number(o.notAfter))
      .map((o) => o.id);
    const totalVersions = res.record.versions.length;
    const firstVersionTimestamps =
      totalVersions > 0
        ? res.record.versions[0]!.timestamps.map((t) => t.hashValue)
        : [];
    const lastVersionTimestamps =
      totalVersions > 0
        ? res.record.versions[res.record.versions.length - 1]!.timestamps.map(
            (t) => t.hashValue,
          )
        : [];

    return {
      ownerIds,
      revokedOwnerIds,
      firstVersionTimestamps,
      lastVersionTimestamps,
      totalVersions,
    };
  }

  async getRecordVersions(
    recordIdEncoded: string,
    page: number,
    pagesize: number,
  ): Promise<{ items: number[] }> {
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded),
    ).toString("hex")}`;

    const skip = (page - 1) * pagesize;
    let res: GetRecordVersionsQuery;

    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetRecordVersions({
        recordId,
        skip,
        pagesize: queryPageSize,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.record) {
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    const items = res.record.versions.map((v) => Number(v.versionNumber));

    return { items };
  }

  async getRecordVersion(
    recordIdEncoded: string,
    versionId: string,
  ): Promise<RecordVersionResponseObject> {
    const recordId = `0x${Buffer.from(
      multibase.base64url.decode(recordIdEncoded),
    ).toString("hex")}`;

    let res: GetRecordVersionQuery;

    const versionNumber = Number(versionId).toString();
    try {
      res = await sdk.GetRecordVersion({ recordId, versionNumber });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.record) {
      throw new NotFoundError("Record Not Found", {
        detail: `Record ${recordIdEncoded} not found`,
      });
    }

    if (!res.record.versions || res.record.versions.length === 0) {
      throw new NotFoundError("Version Not Found", {
        detail: `Version ${versionId} not found`,
      });
    }

    const [version] = res.record.versions;

    const info: InfoObject[] = version!.infos.map((i) => {
      try {
        return JSON.parse(
          Buffer.from(remove0xPrefix(i.content), "hex").toString(),
        ) as InfoObject;
      } catch (error) {
        throw new BadRequestError("Info can not be parsed", {
          detail: `The info related to this versionId can not be parsed to JSON. info: ${i.content}`,
        });
      }
    });

    const hashes = version!.timestamps.map((t) => t.hashValue);

    return {
      hashes,
      info,
    };
  }
}
