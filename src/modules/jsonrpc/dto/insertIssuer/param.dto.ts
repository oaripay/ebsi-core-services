import { IsString, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

import Issuer from "./issuer.dto";

export default class Param {
  @IsString()
  from: string;

  @ValidateNested()
  @Type(() => Issuer)
  issuer: Issuer;
}
