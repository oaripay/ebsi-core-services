import {
  IsEthereumAddress,
  IsHexadecimal,
  IsEnum,
  IsInt,
  Min,
} from "class-validator";
import { Status } from "../shared/enums";

export class UpdateAppPublicKeyParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  publicKeyId: string;

  @IsEnum(Status)
  status: Status;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { UpdateAppPublicKeyParam };
