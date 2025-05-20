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
import { getContractError, schemaIdToHex } from "./schemas.utils.ts";

@Injectable()
export class SchemasService {
  private readonly contract: SchemaSCRegistry;

  private readonly ledgerService: LedgerService;

  private readonly logger = new Logger(SchemasService.name);

  constructor(
    configService: ConfigService<ApiConfig, true>,
    ledgerService: LedgerService,
  ) {
    this.ledgerService = ledgerService;
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

      const contractError = getContractError(error);

      throw new NotFoundError("Schema Not Found", {
        detail:
          contractError === "Schema not found"
            ? `Schema ${schemaId} not found`
            : contractError,
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

    // Get revision
    let revision: Awaited<ReturnType<SchemaSCRegistry["getSchemaRevision"]>>;
    try {
      revision = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevision(hexSchemaId, schemaRevisionId);
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }

      const contractError = getContractError(error);

      switch (contractError) {
        case "Schema not found": {
          throw new NotFoundError("Schema Not Found", {
            detail: `Schema ${schemaId} not found`,
          });
        }
        case "No revision": {
          throw new NotFoundError("Revision Not Found", {
            detail: `Revision ${schemaRevisionId} not found`,
          });
        }
        default: {
          throw new NotFoundError("Not Found", {
            detail: contractError,
          });
        }
      }
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

    // Get metadata
    let metadata: Awaited<
      ReturnType<SchemaSCRegistry["getSchemaRevisionMetadataByMetadataId"]>
    >;
    try {
      metadata = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevisionMetadataByMetadataId(
          hexSchemaId,
          schemaRevisionId,
          metadataId,
        );
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }

      const contractError = getContractError(error);

      switch (contractError) {
        case "Schema not found": {
          throw new NotFoundError("Schema Not Found", {
            detail: `Schema ${schemaId} not found`,
          });
        }
        case "No revision": {
          throw new NotFoundError("Revision Not Found", {
            detail: `Revision ${schemaRevisionId} not found`,
          });
        }
        case "No metadata": {
          throw new NotFoundError("Metadata Not Found", {
            detail: `Metadata ${metadataId} not found`,
          });
        }
        default: {
          throw new NotFoundError("Not Found", {
            detail: contractError,
          });
        }
      }
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

    try {
      // Get metadata
      const metadata = await this.contract
        // @ts-expect-error Error due to CommonJS vs ESM modules imports
        .connect(provider)
        .getSchemaRevisionMetadataIds(
          hexSchemaId,
          schemaRevisionId,
          page,
          pageSize,
        );

      return {
        items: metadata.items,
        total: Number(metadata.total),
      };
    } catch (error) {
      if (isEthersError(error)) {
        this.logger.error(error, error.stack);
      }

      const contractError = getContractError(error);

      switch (contractError) {
        case "Schema not found": {
          throw new NotFoundError("Schema Not Found", {
            detail: `Schema ${schemaId} not found`,
          });
        }
        case "No revision": {
          throw new NotFoundError("Revision Not Found", {
            detail: `Revision ${schemaRevisionId} not found`,
          });
        }
        default: {
          throw new NotFoundError("Not Found", {
            detail: contractError,
          });
        }
      }
    }
  }

  async getSchemaRevisions(
    schemaId: string,
    page: number,
    pageSize: number,
  ): Promise<ItemsList> {
    const provider = this.ledgerService.getProvider();

    const hexSchemaId = schemaIdToHex(schemaId);

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

      const contractError = getContractError(error);

      throw new NotFoundError("Schema Not Found", {
        detail:
          contractError === "Schema not found"
            ? `Schema ${schemaId} not found`
            : contractError,
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
