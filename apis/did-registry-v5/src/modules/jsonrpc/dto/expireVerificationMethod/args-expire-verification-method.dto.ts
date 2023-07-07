import { IsInt, IsString, Min } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsExpireVerificationMethod {
  @IsDidV1()
  did!: string;

  @IsString()
  vMethodId!: string;

  @IsInt()
  @Min(0)
  notAfter!: number;
}

export default { ArgsExpireVerificationMethod };
