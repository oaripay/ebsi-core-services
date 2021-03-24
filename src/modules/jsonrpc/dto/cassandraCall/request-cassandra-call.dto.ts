import { QueryOptions } from "cassandra-driver";
import { IsArray, ArrayMinSize, Equals } from "class-validator";
import { JsonRpcDto } from "../jsonrpc.dto";
import { IsValidCassandraCall } from "../validators";

export class RequestCassandraCallDto extends JsonRpcDto {
  @Equals("cassandra_call")
  method: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsValidCassandraCall()
  params: (string | number | QueryOptions)[];
}

export default RequestCassandraCallDto;
