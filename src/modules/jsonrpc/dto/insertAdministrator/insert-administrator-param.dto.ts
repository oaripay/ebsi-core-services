import { IsEthereumAddress, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import IsDid from "../../validators/IsDid";
import Attribute from "./attribute.dto";

export class InsertAdministratorParam {
  @IsEthereumAddress()
  from: string;

  @IsDid()
  did: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Attribute)
  attribute: Attribute;
}

export default InsertAdministratorParam;
