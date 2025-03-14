import { IsDidV1 } from "@ebsiint-api/shared";
import { IsInt, IsString, Min } from "class-validator";

export class ArgsExpireVerificationMethod {
  @IsDidV1()
  did!: string;

  @IsString()
  vMethodId!: string;

  @IsInt()
  @Min(0)
  notAfter!: number;
}
