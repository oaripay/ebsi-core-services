import {
  IsEthereumAddress,
  IsString,
  IsEnum,
  IsInt,
  Matches,
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
  operations: string;

  @IsInt()
  notBefore: number;

  @IsInt()
  notAfter: number;
}

export default { InsertAuthorizationParam };
