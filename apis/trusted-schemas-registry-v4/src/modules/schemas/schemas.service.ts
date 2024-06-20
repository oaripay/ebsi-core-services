import { Injectable, Logger } from "@nestjs/common";
import { InternalServerError, NotFoundError } from "@ebsiint-api/shared";
import { schemaIdToHex } from "./schemas.utils.js";
import {
  GetAllRevisionsWithMetadataQuery,
  getBuiltGraphSDK,
  GetMetadataQuery,
  GetMetadatasQuery,
  GetRevisionQuery,
  GetRevisionsQuery,
  GetSchemaQuery,
  GetSchemasQuery,
  // eslint-disable-next-line import/extensions, import/no-relative-packages
} from "../../../.graphclient/index.js";

const sdk = getBuiltGraphSDK();

@Injectable()
export class SchemasService {
  private readonly logger = new Logger(SchemasService.name);

  async getSchemas(page = 1, pagesize = 10): Promise<{ items: string[] }> {
    const skip = (page - 1) * pagesize;
    let res: GetSchemasQuery;
    try {
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetSchemas({ skip, pagesize: queryPageSize });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    const schemasIds = res.schemas.map((s) => s.id);
    return { items: schemasIds };
  }

  async getSchema(schemaId: string): Promise<unknown> {
    let res: GetSchemaQuery;
    try {
      const hexSchemaId = schemaIdToHex(schemaId);
      res = await sdk.GetSchema({ schemaId: hexSchemaId });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.schema) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    let schema: unknown;
    try {
      schema = JSON.parse(res.schema.lastRevision.content);
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    return schema;
  }

  async getSchemaRevisions(
    schemaId: string,
    page = 1,
    pagesize = 10,
    validAt?: string,
  ): Promise<{ items: string[] }> {
    const hexSchemaId = schemaIdToHex(schemaId);

    if (validAt) {
      let res: GetAllRevisionsWithMetadataQuery = { schema: { revisions: [] } };

      try {
        res = await sdk.GetAllRevisionsWithMetadata({ schemaId: hexSchemaId });
      } catch (error) {
        this.logger.error(
          error,
          error instanceof Error ? error.stack : undefined,
        );
        throw new InternalServerError();
      }

      if (!res.schema) {
        throw new NotFoundError("Schema Not Found", {
          detail: `Schema ${schemaId} not found`,
        });
      }

      try {
        const validAtDate = new Date(validAt);
        const validRevisionsIds: string[] = [];
        res.schema.revisions.forEach((revision) => {
          revision.metadata.forEach((metadata) => {
            try {
              const decodedMetadata = JSON.parse(metadata.content) as Record<
                string,
                unknown
              >;
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

              validRevisionsIds.push(revision.id);
            } catch (e) {
              // Ignore
            }
          });
        });

        return {
          items: validRevisionsIds.slice(
            (page - 1) * pagesize,
            page * pagesize + 1, // +1 to clarify next pages in pagination
          ),
        };
      } catch {
        throw new NotFoundError("Revisions Not Found", {
          detail: "Revisions not found",
        });
      }
    }

    let res: GetRevisionsQuery;
    try {
      const skip = (page - 1) * pagesize;
      // get one more item to clarify next pages in pagination
      const queryPageSize = pagesize + 1;
      res = await sdk.GetRevisions({
        schemaId: hexSchemaId,
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

    if (!res.schema) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    return {
      items: res.schema.revisions.map((r) => r.id),
    };
  }

  async getSchemaRevision(
    schemaId: string,
    schemaRevisionId: string,
  ): Promise<unknown> {
    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    let res: GetRevisionQuery;
    try {
      res = await sdk.GetRevision({
        schemaId: hexSchemaId,
        revisionId: schemaRevisionId,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.schema) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    if (
      !res.schema.revisions ||
      res.schema.revisions.length === 0 ||
      !res.schema.revisions[0]!.content
    ) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    return JSON.parse(res.schema.revisions[0]!.content) as unknown;
  }

  async getSchemaRevisionMetadataList(
    schemaId: string,
    schemaRevisionId: string,
    page = 1,
    pagesize = 10,
  ): Promise<{ items: string[] }> {
    const hexSchemaId = schemaIdToHex(schemaId);
    const skip = (page - 1) * pagesize;
    // get one more item to clarify next pages in pagination
    const queryPageSize = pagesize + 1;

    // Make sure the schema exists
    let res: GetMetadatasQuery;
    try {
      res = await sdk.GetMetadatas({
        schemaId: hexSchemaId,
        revisionId: schemaRevisionId,
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

    if (!res.schema) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    if (!res.schema.revisions || res.schema.revisions.length === 0) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    return {
      items: res.schema.revisions[0]!.metadata.map((m) => m.id),
    };
  }

  async getSchemaRevisionMetadata(
    schemaId: string,
    schemaRevisionId: string,
    metadataId: string,
  ): Promise<unknown> {
    const hexSchemaId = schemaIdToHex(schemaId);
    let res: GetMetadataQuery;

    try {
      res = await sdk.GetMetadata({
        schemaId: hexSchemaId,
        revisionId: schemaRevisionId,
        metadataId,
      });
    } catch (error) {
      this.logger.error(
        error,
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerError();
    }

    if (!res.schema) {
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    if (!res.schema.revisions || res.schema.revisions.length === 0) {
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    if (
      !res.schema.revisions[0]!.metadata ||
      res.schema.revisions[0]!.metadata.length === 0
    ) {
      throw new NotFoundError("Metadata Not Found", {
        detail: `Metadata ${metadataId} not found`,
      });
    }

    return JSON.parse(res.schema.revisions[0]!.metadata[0]!.content) as unknown;
  }
}

export default SchemasService;
