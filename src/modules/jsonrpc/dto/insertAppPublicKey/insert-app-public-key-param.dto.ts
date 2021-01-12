import {
  IsEthereumAddress,
  IsHexadecimal,
  IsEnum,
  IsInt,
  IsString,
  Min,
} from "class-validator";
import { Status } from "../shared/enums";

export class InsertAppPublicKeyParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  applicationId: string;

  @IsString()
  publicKey: string;

  @IsEnum(Status)
  status: Status;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { InsertAppPublicKeyParam };
