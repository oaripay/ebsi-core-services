import {
  BadRequestError,
  InternalServerError,
  multibase,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ethers } from "ethers";

import {
  getBuiltGraphSDK,
  GetOwnerQuery,
  GetRecordQuery,
  GetRecordsQuery,
  GetRecordVersionQuery,
  GetRecordVersionsQuery,
  GetTimestampRecordIdsFirstVersionQuery,
} from "../../../.graphclient/index.js";
import {
  InfoObject,
  RecordResponseObject,
  RecordVersionResponseObject,
} from "./records.interface.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export default class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

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
      .map((o) => o.id.slice(o.id.lastIndexOf("0x")));
    const revokedOwnerIds = res.record.owners
      .filter((o) => now > Number(o.notAfter))
      .map((o) => o.id.slice(o.id.lastIndexOf("0x")));
    const totalVersions = res.record.versions.length;
    const firstVersionTimestamps =
      totalVersions > 0
        ? res.record.versions[0]!.timestamps.map((t) => t.hashValue)
        : [];
    const lastVersionTimestamps =
      totalVersions > 0
        ? res.record.versions.at(-1)!.timestamps.map((t) => t.hashValue)
        : [];

    return {
      firstVersionTimestamps,
      lastVersionTimestamps,
      ownerIds,
      revokedOwnerIds,
      totalVersions,
    };
  }

  async getRecordIds(
    page: number,
    pagesize: number,
  ): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetRecordsQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetRecords({ pagesize: queryPageSize, skip });
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
        pagesize: queryPageSize,
        skip,
        timestampId,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const ids = res.timestampSet.recordIdsFirstVersion.map((r) => r.id);
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
      res = await sdk.GetOwner({ id: owner, pagesize: queryPageSize, skip });
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

    return { items: res.owner.recordIds.map((r) => r.id) };
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
      } catch {
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
        pagesize: queryPageSize,
        recordId,
        skip,
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
}
