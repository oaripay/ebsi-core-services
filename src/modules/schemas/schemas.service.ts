import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import pLimit from "p-limit";
import { ContractService } from "../../shared/services/contract.service";
import { SchemaSCRegistry } from "../../contracts/trusted-schemas";
import { ItemsList } from "./schemas.interface";
import { range } from "./schemas.utils";
import { AsyncReturnType } from "../../shared/types/async-return-type";

const MAX_RESULTS_PER_PAGE = 50;
const MAX_CONCURRENT_PROMISES = 10;

@Injectable()
export class SchemasService {
  private readonly logger = new Logger(SchemasService.name);

  constructor(private contractService: ContractService) {}

  async getSchemas(page: number, pageSize: number): Promise<ItemsList> {
    const result = await (
      await this.contractService.getContract()
    ).getSchemaIds(page, pageSize);

    return {
      items: result.items,
      total: result.total.toNumber(),
    };
  }

  async getSchema(schemaId: string): Promise<unknown> {
    let schema: AsyncReturnType<SchemaSCRegistry["getLatestSchemaRevision"]>;

    try {
      schema = await (
        await this.contractService.getContract()
      ).getLatestSchemaRevision(schemaId);
    } catch (error) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    const decodedSchemaInfo = JSON.parse(
      Buffer.from(schema.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedSchemaInfo;
  }

  async getSchemaRevisions(
    schemaId: string,
    page: number,
    pageSize: number,
    validAt?: string
  ): Promise<ItemsList> {
    // Make sure the schema exists
    try {
      await (
        await this.contractService.getContract()
      ).getLatestSchemaRevision(schemaId);
    } catch (error) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Return only revisions valid at the given time (this is excessively inefficient!)
    if (validAt) {
      // Get all revisions IDs
      const allRevisionsIds: string[] = [];

      // Get the first MAX_RESULTS_PER_PAGE revisions IDs
      const revisions = await (
        await this.contractService.getContract()
      ).getSchemaRevisionIds(schemaId, 1, MAX_RESULTS_PER_PAGE);
      allRevisionsIds.push(...revisions.items);
      const total = revisions.total.toNumber();

      const limit = pLimit(MAX_CONCURRENT_PROMISES); // Limit concurrent promises

      if (total > MAX_RESULTS_PER_PAGE) {
        const contract = await this.contractService.getContract();
        // We need to fetch the next pages
        allRevisionsIds.push(
          ...(
            await Promise.all(
              // From page 2 to page "Math.ceil(total / MAX_RESULTS_PER_PAGE)"
              range(2, Math.ceil(total / MAX_RESULTS_PER_PAGE)).map(
                (pageIndex) =>
                  limit(() =>
                    contract.getSchemaRevisionIds(
                      schemaId,
                      pageIndex,
                      MAX_RESULTS_PER_PAGE
                    )
                  )
              )
            )
          ).reduce((arr, row) => arr.concat(row.items), [] as string[])
        );
      }

      // For each revision ID, get latest metadata
      const contract = await this.contractService.getContract();
      const allMetadata = await Promise.all(
        allRevisionsIds.map((id) =>
          limit(() => contract.getLatestSchemaRevisionMetadataByRevisionId(id))
        )
      );

      const validRevisionsIds: string[] = [];
      allMetadata.forEach((metadata, index) => {
        try {
          const decodedMetadata = JSON.parse(
            Buffer.from(metadata.slice(2), "hex").toString("utf-8")
          ) as { [x: string]: unknown };

          const validAtDate = new Date(validAt);

          // If validFrom > validAt, ignore
          if (
            decodedMetadata.validFrom &&
            new Date(decodedMetadata.validFrom as string) > validAtDate
          ) {
            return;
          }

          // If validTo < validAt, ignore
          if (
            decodedMetadata.validTo &&
            new Date(decodedMetadata.validTo as string) < validAtDate
          ) {
            return;
          }

          validRevisionsIds.push(allRevisionsIds[index]);
        } catch (e) {
          // Ignore
        }
      });

      return {
        items: validRevisionsIds.slice((page - 1) * pageSize, page * pageSize),
        total: validRevisionsIds.length,
      };
    }

    // Get the revisions
    const revisions = await (
      await this.contractService.getContract()
    ).getSchemaRevisionIds(schemaId, page, pageSize);

    return {
      items: revisions.items,
      total: revisions.total.toNumber(),
    };
  }

  async getSchemaRevision(
    schemaId: string,
    schemaRevisionId: string
  ): Promise<unknown> {
    // Make sure the schema exists
    try {
      await (
        await this.contractService.getContract()
      ).getLatestSchemaRevision(schemaId);
    } catch (error) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Get revision
    let revision: AsyncReturnType<SchemaSCRegistry["getSchemaRevision"]>;
    try {
      revision = await (
        await this.contractService.getContract()
      ).getSchemaRevision(schemaRevisionId);
    } catch (error) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    const decodedSchemaRevisionInfo = JSON.parse(
      Buffer.from(revision.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedSchemaRevisionInfo;
  }

  async getSchemaRevisionMetadataList(
    schemaId: string,
    schemaRevisionId: string,
    page: number,
    pageSize: number
  ): Promise<ItemsList> {
    // Make sure the schema exists
    try {
      await (
        await this.contractService.getContract()
      ).getLatestSchemaRevision(schemaId);
    } catch (error) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Make sure the revision exists
    try {
      await (
        await this.contractService.getContract()
      ).getSchemaRevision(schemaRevisionId);
    } catch (error) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    // Get metadata
    const metadata = await (
      await this.contractService.getContract()
    ).getSchemaRevisionMetadataIds(schemaRevisionId, page, pageSize);

    return {
      items: metadata.items,
      total: metadata.total.toNumber(),
    };
  }

  async getSchemaRevisionMetadata(
    schemaId: string,
    schemaRevisionId: string,
    metadataId: string
  ): Promise<unknown> {
    // Make sure the schema exists
    try {
      await (
        await this.contractService.getContract()
      ).getLatestSchemaRevision(schemaId);
    } catch (error) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Make sure the revision exists
    try {
      await (
        await this.contractService.getContract()
      ).getSchemaRevision(schemaRevisionId);
    } catch (error) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    // Get metadata
    let metadata: AsyncReturnType<
      SchemaSCRegistry["getSchemaRevisionMetadataByMetadataId"]
    >;
    try {
      metadata = await (
        await this.contractService.getContract()
      ).getSchemaRevisionMetadataByMetadataId(metadataId);
    } catch (error) {
      throw new NotFoundError("Metadata Not Found", {
        detail: `Metadata ${metadataId} not found`,
      });
    }

    const decodedMetadata = JSON.parse(
      Buffer.from(metadata.slice(2), "hex").toString("utf-8")
    ) as unknown;

    return decodedMetadata;
  }
}

export default SchemasService;
