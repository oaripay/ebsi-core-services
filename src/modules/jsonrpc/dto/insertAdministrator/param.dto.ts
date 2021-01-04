import { IsEthereumAddress, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import IsDid from "../../types/IsDid";
import Attribute from "./attribute.dto";

export default class Param {
  @IsEthereumAddress()
  from: string;

  @IsDid()
  did: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Attribute)
  attribute: Attribute;
}
