import { IsArray, Equals, IsOptional, IsString } from "class-validator";

export class BesuDto {
  @Equals("2.0")
  jsonrpc!: "2.0";

  @IsString()
  method!: string;

  @IsArray()
  params!: unknown[];

  @IsOptional()
  id?: number | string;
}

export default { BesuDto };
