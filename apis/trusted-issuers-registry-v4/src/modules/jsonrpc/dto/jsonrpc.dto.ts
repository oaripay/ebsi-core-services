import { IsString, IsArray, Equals, IsOptional } from "class-validator";

export class JsonRpcDto {
  @Equals("2.0")
  jsonrpc!: "2.0";

  @IsString()
  method!: string;

  @IsArray()
  params!: Array<unknown>;

  @IsOptional()
  id?: number | string;
}

export default { JsonRpcDto };
