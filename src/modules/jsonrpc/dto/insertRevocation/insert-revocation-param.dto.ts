import { IsEthereumAddress, IsHexadecimal, IsInt, Min } from "class-validator";
import { IsDid } from "../../validators";

export class InsertRevocationParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  applicationId: string;

  @IsDid()
  revokedBy: string;

  @IsInt()
  @Min(0)
  notBefore: number;
}

export default { InsertRevocationParam };
