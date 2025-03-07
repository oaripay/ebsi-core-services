import type { SchemaSCRegistry } from "@ebsiint-sc/trusted-schemas-registry-v2";

import {
  isEthersError,
  NotFoundError,
  remove0xPrefix,
} from "@ebsiint-api/shared";
import { SchemaSCRegistry__factory } from "@ebsiint-sc/trusted-schemas-registry-v2";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiConfig } from "../../config/configuration.ts";
import type { ItemsList } from "./schemas.interface.ts";

import { LedgerService } from "../ledger/ledger.service.ts";
import { schemaIdToHex } from "./schemas.utils.ts";

@Injectable()
export class SchemasService {
  private readonly contract: SchemaSCRegistry;

  private readonly logger = new Logger(SchemasService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    private ledgerService: LedgerService,
  ) {
    const contractAddress = configService.get("contractAddr", {
      infer: true,
    });
    this.contract = SchemaSCRegistry__factory.connect(contractAddress);
  }

  async getSchema(schemaId: string): Promise<unknown> {
    const provider = this.ledgerService.getProvider();

    let schema: Awaited<
      ReturnType<SchemaSCRegistry["getLatestSchemaRevision"]>
    >;
    const hexSchemaId = schemaIdToHex(schemaId);

    try {
      schema = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    const decodedSchemaInfo = JSON.parse(
      Buffer.from(remove0xPrefix(schema), "hex").toString("utf8"),
    ) as unknown;

    return decodedSchemaInfo;
  }

  async getSchemaRevision(
    schemaId: string,
    schemaRevisionId: string,
  ): Promise<unknown> {
    const provider = this.ledgerService.getProvider();

    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Get revision
    let revision: Awaited<ReturnType<SchemaSCRegistry["getSchemaRevision"]>>;
    try {
      revision = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevision(schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    const decodedSchemaRevisionInfo = JSON.parse(
      Buffer.from(remove0xPrefix(revision), "hex").toString("utf8"),
    ) as unknown;

    return decodedSchemaRevisionInfo;
  }

  async getSchemaRevisionMetadata(
    schemaId: string,
    schemaRevisionId: string,
    metadataId: string,
  ): Promise<unknown> {
    const provider = this.ledgerService.getProvider();

    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Make sure the revision exists
    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevision(schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
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
      metadata = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevisionMetadataByMetadataId(metadataId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Metadata Not Found", {
        detail: `Metadata ${metadataId} not found`,
      });
    }

    const decodedMetadata = JSON.parse(
      Buffer.from(remove0xPrefix(metadata), "hex").toString("utf8"),
    ) as unknown;

    return decodedMetadata;
  }

  async getSchemaRevisionMetadataList(
    schemaId: string,
    schemaRevisionId: string,
    page: number,
    pageSize: number,
  ): Promise<ItemsList> {
    const provider = this.ledgerService.getProvider();

    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    // Make sure the revision exists
    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevision(schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Revision Not Found", {
        detail: `Revision ${schemaRevisionId} not found`,
      });
    }

    try {
      // Get metadata
      const metadata = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevisionMetadataIds(schemaRevisionId, page, pageSize);

      return {
        items: metadata.items,
        total: Number(metadata.total),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schema revision metadata not found", {
        detail: `Metadata for revision ${schemaRevisionId} not found`,
      });
    }
  }

  async getSchemaRevisions(
    schemaId: string,
    page: number,
    pageSize: number,
  ): Promise<ItemsList> {
    const provider = this.ledgerService.getProvider();

    const hexSchemaId = schemaIdToHex(schemaId);

    // Make sure the schema exists
    try {
      await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getLatestSchemaRevision(hexSchemaId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schema Not Found", {
        detail: `Schema ${schemaId} not found`,
      });
    }

    try {
      // Get the revisions
      const revisions = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevisionIds(hexSchemaId, page, pageSize);

      return {
        items: revisions.items,
        total: Number(revisions.total),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Revisions Not Found", {
        detail: "Revisions not found",
      });
    }
  }

  async getSchemas(page: number, pageSize: number): Promise<ItemsList> {
    const provider = this.ledgerService.getProvider();

    try {
      const result = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaIds(page, pageSize);

      return {
        items: result.items,
        total: Number(result.total),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }
      throw new NotFoundError("Schemas Not Found", {
        detail: `Schemas not found`,
      });
    }
  }
}

export default SchemasService;
