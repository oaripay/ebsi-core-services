import { IsString, IsArray, Equals, IsOptional } from "class-validator";

export default class JsonRpcDto {
  @Equals("2.0")
  jsonrpc: string;

  @IsString()
  method: string;

  @IsArray()
  params: Array<unknown>;

  @IsOptional()
  id: number | string;
}
