import {
  IsEthereumAddress,
  IsHexadecimal,
  IsEnum,
  IsInt,
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
  notAfter: number;
}

export default { UpdateAppPublicKeyParam };
