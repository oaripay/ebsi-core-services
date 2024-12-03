import { Equals, IsArray, IsOptional } from "class-validator";

import { IsValidMethod, PUBLIC_BESU_METHODS } from "../validators/index.js";

export class BesuDto {
  @Equals("2.0")
  jsonrpc!: string;

  @IsValidMethod()
  method!: (typeof PUBLIC_BESU_METHODS)[number];

  @IsArray()
  params!: unknown[];

  @IsOptional()
  id?: number | string;
}

export default { BesuDto };
