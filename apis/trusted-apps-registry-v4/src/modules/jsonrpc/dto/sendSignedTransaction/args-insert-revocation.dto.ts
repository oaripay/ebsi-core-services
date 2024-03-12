import { IsHexadecimal, IsInt, Matches, Min } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsInsertRevocation {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  applicationId!: string;

  @IsDidV1()
  revokedBy!: string;

  @IsInt()
  @Min(0)
  notBefore!: number;
}

export default { ArgsInsertRevocation };
