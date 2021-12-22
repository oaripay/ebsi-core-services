import { IsArray, Equals, IsOptional, IsString } from "class-validator";
import { IsValidMethod } from "../validators";

export class BesuDto {
  @Equals("2.0")
  jsonrpc: string;

  @IsValidMethod()
  method: string;

  @IsArray()
  @IsString({ each: true })
  params: string[];

  @IsOptional()
  id: number | string;
}

export default { BesuDto };
