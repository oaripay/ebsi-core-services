import {
  IsEthereumAddress,
  IsString,
  IsEnum,
  IsInt,
  Matches,
  Min,
} from "class-validator";
import { IsDid } from "../../validators";
import { Status } from "../shared/enums";

export class InsertAuthorizationParam {
  @IsEthereumAddress()
  from: string;

  @IsString()
  name: string;

  @IsString()
  authorizedAppName: string;

  @IsDid()
  iss: string;

  @IsEnum(Status)
  status: Status;

  @IsString()
  @Matches(/^[crud]{0,4}$/)
  permissions: string;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { InsertAuthorizationParam };
