import {
  IsEthereumAddress,
  IsHexadecimal,
  IsObject,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { IsDid } from "../../validators";
import { Attribute } from "../shared/attribute.dto";

export class UpdateAdministratorParam {
  @IsEthereumAddress()
  from: string;

  @IsDid()
  did: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Attribute)
  attribute: Attribute;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default { UpdateAdministratorParam };
