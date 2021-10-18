import { IsArray, Equals, IsOptional } from "class-validator";
import { IsValidMethod } from "../validators";

export class JsonRpcDto {
  @Equals("2.0")
  jsonrpc: string;

  @IsValidMethod()
  method: string;

  @IsArray()
  params: Array<unknown>;

  @IsOptional()
  id: number | string;
}

export default { JsonRpcDto };
