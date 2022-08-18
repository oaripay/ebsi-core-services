import { IsArray, Equals, IsOptional } from "class-validator";
import { IsValidMethod } from "../validators";

export class BesuDto {
  @Equals("2.0")
  jsonrpc: string;

  @IsValidMethod()
  method: string;

  @IsArray()
  params: unknown[];

  @IsOptional()
  id: number | string;
}

export default { BesuDto };
