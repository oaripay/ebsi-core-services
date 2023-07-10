import { IsHexadecimal, IsInt, Min } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsInsertRevocation {
  @IsHexadecimal()
  applicationId: string;

  @IsDidV1()
  revokedBy: string;

  @IsInt()
  @Min(0)
  notBefore: number;
}

export default { ArgsInsertRevocation };
