import { IsLowercase, IsHexadecimal } from "class-validator";
import IsDid from "../../validators/IsDid";

export class ArgsInsertAdministrator {
  @IsDid()
  @IsLowercase()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default ArgsInsertAdministrator;
