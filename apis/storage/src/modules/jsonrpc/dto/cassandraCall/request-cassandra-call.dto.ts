import { QueryOptions } from "cassandra-driver";
import { IsArray, ArrayMinSize, Equals } from "class-validator";
import { JsonRpcDto } from "../jsonrpc.dto.js";
import { IsValidCassandraCall } from "../validators/index.js";

export class RequestCassandraCallDto extends JsonRpcDto {
  @Equals("cassandra_call")
  declare method: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsValidCassandraCall()
  declare params: (string | number | QueryOptions)[];
}

export default RequestCassandraCallDto;
