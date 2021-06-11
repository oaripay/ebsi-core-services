import { Injectable, Logger } from "@nestjs/common";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@cef-ebsi/problem-details-errors";
import { DidTimestampResponseObject } from "./did-timestamps.interface";
import { LedgerService } from "../ledger/ledger.service";
import { DidRegistry } from "../../contracts/did-registry";
import { AsyncReturnType } from "../../shared/types/async-return-type";
import {
  IanaName,
  multihashEncode,
  isSupportedIanaName,
  ianaNameToMultihashName,
} from "../../shared/utils";

@Injectable()
export class DidTimestampsService {
  private readonly logger = new Logger(DidTimestampsService.name);

  constructor(private ledgerService: LedgerService) {}

  async getDidTimestamps(
    page: number,
    pageSize: number,
    identifier?: string,
    versionId?: number
  ): Promise<{
    items: string[];
    total: number;
  }> {
    // Throw an error if only 1 param (between identifier and versionId) is defined
    if ((identifier && !versionId) || (!identifier && versionId)) {
      throw new BadRequestError(BadRequestError.defaultTitle, {
        detail:
          "Invalid parameters: make sure to define both 'identifier' and 'version-id'",
      });
    }

    if (identifier && versionId) {
      try {
        const items = await (
          await this.ledgerService.getContract()
        ).getDidDocumentVersionDidTimestampIds(
          `0x${Buffer.from(identifier.toLowerCase(), "utf-8").toString("hex")}`,
          versionId
        );

        return {
          items,
          total: items.length,
        };
      } catch {
        return {
          items: [],
          total: 0,
        };
      }
    }

    const didTimestamps = await (
      await this.ledgerService.getContract()
    ).getDidTimestamps(page, pageSize);

    return {
      items: didTimestamps.items,
      total: didTimestamps.total.toNumber(),
    };
  }

  async getDidTimestamp(
    timestampId: string
  ): Promise<DidTimestampResponseObject> {
    let timestamp: AsyncReturnType<DidRegistry["getDidTimestampById"]>;

    try {
      timestamp = await (
        await this.ledgerService.getContract()
      ).getDidTimestampById(timestampId);
    } catch (e) {
      throw new NotFoundError("Timestamp Not Found", {
        detail: `Timestamp ${timestampId} not found`,
      });
    }

    const hashAlg = await (
      await this.ledgerService.getContract()
    ).getHashAlgorithmById(timestamp.hash.algorithm);

    const ianaName = hashAlg.ianaName.toLowerCase();

    // Check if ianaName is valid
    if (!isSupportedIanaName(ianaName)) {
      this.logger.error(`Unsupported IANA name: ${hashAlg.ianaName}`);
      throw new InternalServerError(InternalServerError.defaultTitle, {
        detail: "Unsupported hash algorithm",
      });
    }

    // Multi-hash (base64 multi-encoded)
    const multihashEncodedHash = multihashEncode(
      timestamp.hash.value,
      ianaNameToMultihashName(ianaName as IanaName)
    );

    return {
      hash: multihashEncodedHash,
      timestampedBy: timestamp.timestampedBy,
      blockNumber: timestamp.blockNumber.toNumber(),
      data: timestamp.data,
    };
  }
}

export default DidTimestampsService;
