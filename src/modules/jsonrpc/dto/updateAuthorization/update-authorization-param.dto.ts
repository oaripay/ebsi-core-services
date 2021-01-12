import {
  IsEthereumAddress,
  IsString,
  IsEnum,
  IsInt,
  IsHexadecimal,
  Matches,
} from "class-validator";
import { Status } from "../shared/enums";

export class UpdateAuthorizationParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  authorizationId: string;

  @IsEnum(Status)
  status: Status;

  @IsString()
  @Matches(/^[crud]{0,4}$/)
  permissions: string;

  @IsInt()
  notAfter: number;
}

export default { UpdateAuthorizationParam };
