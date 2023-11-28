import { Injectable, Logger } from "@nestjs/common";
import pLimit from "p-limit";
import { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry-v2";
import {
  isEthersError,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { LedgerService } from "../ledger/ledger.service.js";
import { ItemsList } from "./schemas.interface.js";
import { range, schemaIdToHex } from "./schemas.utils.js";

const MAX_RESULTS_PER_PAGE = 50;
const MAX_CONCURRENT_PROMISES = 10;

@Injectable()
export class SchemasService {
  private readonly logger = new Logger(SchemasService.name);

  constructor(private ledgerService: LedgerService) {}

  async getSchemas(page: number, pageSize: number): Promise<ItemsList> {
    try {
      const result = await (
        await this.ledgerService.getContract()
      ).getSchemaIds(page, pageSize);

      return {
        items: result.items,
        total: result.total.toNumber(),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schemas Not Found", {
        detail: `Schemas not found`,
      });
    }
  }

  async getSchema(schemaId: string): Promise<unknown> {
    let schema: Awaited<
      ReturnType<SchemaSCRegistry["getLatestSchemaRevision"]>
    >;
    const hexSchemaId = schemaIdToHex(schemaId);

    try {
      schema = await (
        await this.ledgerService.getContract()
      ).getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    const decodedSchemaInfo = JSON.parse(
      Buffer.from(remove0xPrefix(schema), "hex").toString("utf-8"),
    ) as unknown;

    return decodedSchemaInfo;
  }

  async getSchemaRevisions(
    schemaId: string,
    page: number,
    pageSize: number,
    validAt?: string,
  ): Promise<ItemsList> {
    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await (
        await this.ledgerService.getContract()
      ).getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    try {
      // Return only revisions valid at the given time (this is excessively inefficient!)
      if (validAt) {
        // Get all revisions IDs
        const allRevisionsIds: string[] = [];

        // Get the first MAX_RESULTS_PER_PAGE revisions IDs
        const revisions = await (
          await this.ledgerService.getContract()
        ).getSchemaRevisionIds(hexSchemaId, 1, MAX_RESULTS_PER_PAGE);
        allRevisionsIds.push(...revisions.items);
        const total = revisions.total.toNumber();

        const limit = pLimit(MAX_CONCURRENT_PROMISES); // Limit concurrent promises

        if (total > MAX_RESULTS_PER_PAGE) {
          const contract = await this.ledgerService.getContract();
          // We need to fetch the next pages
          allRevisionsIds.push(
            ...(
              await Promise.all(
                // From page 2 to page "Math.ceil(total / MAX_RESULTS_PER_PAGE)"
                range(2, Math.ceil(total / MAX_RESULTS_PER_PAGE)).map(
                  (pageIndex) =>
                    limit(() =>
                      contract.getSchemaRevisionIds(
                        hexSchemaId,
                        pageIndex,
                        MAX_RESULTS_PER_PAGE,
                      ),
                    ),
                ),
              )
            ).reduce((arr, row) => arr.concat(row.items), [] as string[]),
          );
        }

        // For each revision ID, get latest metadata
        const contract = await this.ledgerService.getContract();
        const allMetadata = await Promise.all(
          allRevisionsIds.map((id) =>
            limit(() =>
              contract.getLatestSchemaRevisionMetadataByRevisionId(id),
            ),
          ),
        );

        const validRevisionsIds: string[] = [];
        allMetadata.forEach((metadata, index) => {
          try {
            const decodedMetadata = JSON.parse(
              Buffer.from(remove0xPrefix(metadata), "hex").toString("utf-8"),
            ) as Record<string, unknown>;

            const validAtDate = new Date(validAt);

            // If validFrom > validAt, ignore
            if (
              decodedMetadata["validFrom"] &&
              new Date(decodedMetadata["validFrom"] as string) > validAtDate
            ) {
              return;
            }

            // If validTo < validAt, ignore
            if (
              decodedMetadata["validTo"] &&
              new Date(decodedMetadata["validTo"] as string) < validAtDate
            ) {
              return;
            }

            validRevisionsIds.push(allRevisionsIds[index]!);
          } catch (e) {
            // Ignore
          }
        });

        return {
          items: validRevisionsIds.slice(
            (page - 1) * pageSize,
            page * pageSize,
          ),
          total: validRevisionsIds.length,
        };
      }

      // Get the revisions
      const revisions = await (
        await this.ledgerService.getContract()
      ).getSchemaRevisionIds(hexSchemaId, page, pageSize);

      return {
        items: revisions.items,
        total: revisions.total.toNumber(),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Revisions Not Found", {
        detail: "Revisions not found",
      });
    }
  }

  async getSchemaRevision(
    schemaId: string,
    schemaRevisionId: string,
  ): Promise<unknown> {
    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await (
        await this.ledgerService.getContract()
      ).getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Get revision
    let revision: Awaited<ReturnType<SchemaSCRegistry["getSchemaRevision"]>>;
    try {
      revision = await (
        await this.ledgerService.getContract()
      ).getSchemaRevision(schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    const decodedSchemaRevisionInfo = JSON.parse(
      Buffer.from(remove0xPrefix(revision), "hex").toString("utf-8"),
    ) as unknown;

    return decodedSchemaRevisionInfo;
  }

  async getSchemaRevisionMetadataList(
    schemaId: string,
    schemaRevisionId: string,
    page: number,
    pageSize: number,
  ): Promise<ItemsList> {
    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await (
        await this.ledgerService.getContract()
      ).getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Make sure the revision exists
    try {
      await (
        await this.ledgerService.getContract()
      ).getSchemaRevision(schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    try {
      // Get metadata
      const metadata = await (
        await this.ledgerService.getContract()
      ).getSchemaRevisionMetadataIds(schemaRevisionId, page, pageSize);

      return {
        items: metadata.items,
        total: metadata.total.toNumber(),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schema revision metadata not found", {
        detail: `Metadata for revision ${schemaRevisionId} not found`,
      });
    }
  }

  async getSchemaRevisionMetadata(
    schemaId: string,
    schemaRevisionId: string,
    metadataId: string,
  ): Promise<unknown> {
    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await (
        await this.ledgerService.getContract()
      ).getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Make sure the revision exists
    try {
      await (
        await this.ledgerService.getContract()
      ).getSchemaRevision(schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    // Get metadata
    let metadata: Awaited<
      ReturnType<SchemaSCRegistry["getSchemaRevisionMetadataByMetadataId"]>
    >;
    try {
      metadata = await (
        await this.ledgerService.getContract()
      ).getSchemaRevisionMetadataByMetadataId(metadataId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error);
      }
      throw new NotFoundError("Metadata Not Found", {
        detail: `Metadata ${metadataId} not found`,
      });
    }

    const decodedMetadata = JSON.parse(
      Buffer.from(remove0xPrefix(metadata), "hex").toString("utf-8"),
    ) as unknown;

    return decodedMetadata;
  }
}

export default SchemasService;
