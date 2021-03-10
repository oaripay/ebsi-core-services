import { Injectable, Logger } from "@nestjs/common";
import { NotFoundError } from "@cef-ebsi/problem-details-errors";
import { ContractService } from "../../shared/services/contract.service";
import { SchemaSCRegistry } from "../../contracts/trusted-schemas";
import { SchemasList } from "./schemas.interface";
import { AsyncReturnType } from "../../shared/types/async-return-type";

@Injectable()
export class SchemasService {
  private readonly logger = new Logger(SchemasService.name);

  private schemaScRegistryContract: SchemaSCRegistry;

  constructor(private contractService: ContractService) {
    this.schemaScRegistryContract = this.contractService.getContract();
  }

  async getSchemas(page: number, pageSize: number): Promise<SchemasList> {
    const result = await this.schemaScRegistryContract.getSchemaIds(
      page,
      pageSize
    );

    return {
      items: result.items,
      total: result.total.toNumber(),
    };
  }

  async getSchema(schemaId: string): Promise<unknown> {
    let schema: AsyncReturnType<SchemaSCRegistry["getLatestSchemaRevision"]>;

    try {
      schema = await this.schemaScRegistryContract.getLatestSchemaRevision(
        schemaId
      );
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
}

export default SchemasService;
