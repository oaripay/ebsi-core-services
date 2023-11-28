import { IsString, IsArray, Equals, IsOptional } from "class-validator";

export class JsonRpcDto {
  @Equals("2.0")
  jsonrpc!: string;

  @IsString()
  method!: string;

  @IsArray()
  params!: unknown[];

  @IsOptional()
  id?: number | string;
}

export default { JsonRpcDto };
