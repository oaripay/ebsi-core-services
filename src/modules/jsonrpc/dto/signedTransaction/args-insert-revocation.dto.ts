import { IsHexadecimal, IsInt, Min } from "class-validator";
import { IsDid } from "../../validators";

export class ArgsInsertRevocation {
  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  revokedBy: string;

  @IsInt()
  @Min(0)
  notBefore: number;
}

export default { ArgsInsertRevocation };
