import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, QueryOptions, types } from "cassandra-driver";
import { RequestCassandraCallDto } from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import { validateClass, isReadOperation } from "./jsonrpc.utils";
import { CassandraService } from "../cassandra/cassandra.service";
import { ApiConfig } from "../../config/configuration";
import { CassandraConsistency } from "../../config/cassandra.config";

@Injectable()
export class JsonRpcService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JsonRpcService.name);

  private cassandraClient: Client;

  private consistency: CassandraConsistency;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private cassandraService: CassandraService
  ) {}

  onApplicationBootstrap(): void {
    this.cassandraClient = this.cassandraService.getClient();
    this.consistency = this.cassandraService.getConsistency();
  }

  async cassandraCall(
    body: RequestCassandraCallDto,
    id?: number | string
  ): Promise<{
    rows: types.ResultSet["rows"];
    pageState: types.ResultSet["pageState"];
  }> {
    try {
      await validateClass(RequestCassandraCallDto, body);
      const [query, ...params] = body.params;
      const options: QueryOptions = {
        consistency: isReadOperation(query as string)
          ? this.consistency.read
          : this.consistency.write,
        prepare: true,
      };
      if (params.length > 0 && typeof params[params.length - 1] === "object") {
        Object.assign(options, params.pop());
      }
      const { rows, pageState } = await this.cassandraClient.execute(
        query as string,
        params,
        options
      );
      return { rows, pageState };
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      error.stack = (err as Error).stack;
      throw error;
    }
  }
}

export default { JsonRpcService };
