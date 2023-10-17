import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InvalidRequestJsonRpcError } from "@ebsiint-api/shared";
import { Client, QueryOptions, types } from "cassandra-driver";
import { RequestCassandraCallDto } from "./dto/index.js";
import { validateClass, isReadOperation } from "./jsonrpc.utils.js";
import { CassandraService } from "../cassandra/cassandra.service.js";
import { CassandraConsistency } from "../../config/cassandra.config.js";

@Injectable()
export class JsonRpcService implements OnApplicationBootstrap {
  private cassandraClient!: Client;

  private consistency!: CassandraConsistency;

  constructor(private cassandraService: CassandraService) {}

  onApplicationBootstrap(): void {
    this.cassandraClient = this.cassandraService.getClient();
    this.consistency = this.cassandraService.getConsistency();
  }

  async cassandraCall(
    body: RequestCassandraCallDto,
    id?: number | string,
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
        options,
      );
      return { rows, pageState };
    } catch (err) {
      const error = new InvalidRequestJsonRpcError((err as Error).message, id);
      if (err instanceof Error && err.stack) {
        error.stack = err.stack;
      }
      throw error;
    }
  }
}

export default { JsonRpcService };
