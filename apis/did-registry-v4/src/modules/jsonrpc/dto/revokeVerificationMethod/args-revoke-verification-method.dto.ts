import { IsInt, IsString, Min } from "class-validator";
import { IsDidV1 } from "../../../../shared/validators";

export class ArgsRevokeVerificationMethod {
  @IsDidV1()
  did: string;

  @IsString()
  vMethodId: string;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsRevokeVerificationMethod };
