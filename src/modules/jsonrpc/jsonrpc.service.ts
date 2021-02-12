import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client, QueryOptions, types } from "cassandra-driver";
import { RequestCassandraCallDto } from "./dto";
import { InvalidRequestJsonRpcError } from "./errors";
import CassandraService from "../../shared/services/cassandra.service";
import { validateClass, isReadOperation } from "./jsonrpc.utils";
import { ApiConfig, CassandraConsistency } from "../../config/configuration";

@Injectable()
export class JsonRpcService {
  private readonly logger = new Logger(JsonRpcService.name);

  private cassandraClient: Client;

  private consistency: CassandraConsistency;

  constructor(
    private configService: ConfigService<ApiConfig>,
    private cassandraService: CassandraService
  ) {
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
