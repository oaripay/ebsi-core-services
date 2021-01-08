import {
  IsEthereumAddress,
  IsHexadecimal,
  IsEnum,
  IsString,
} from "class-validator";
import { Domain } from "../shared/enums";

export class UpdateAppParam {
  @IsEthereumAddress()
  from: string;

  @IsHexadecimal()
  applicationId: string;

  @IsString()
  name: string;

  @IsEnum(Domain)
  domain: Domain;
}

export default { UpdateAppParam };
