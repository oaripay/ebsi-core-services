import { Equals, IsArray, IsOptional, IsString } from "class-validator";

export class JsonRpcDto {
  @Equals("2.0")
  jsonrpc!: "2.0";

  @IsString()
  method!: string;

  @IsArray()
  params!: unknown[];

  @IsOptional()
  id?: null | number | string;
}

export default { JsonRpcDto };
