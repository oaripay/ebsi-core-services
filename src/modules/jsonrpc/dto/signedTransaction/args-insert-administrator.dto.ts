import { IsLowercase, IsHexadecimal } from "class-validator";
import IsDid from "../../types/IsDid";

export default class ArgsInsertAdministrator {
  @IsDid()
  @IsLowercase()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}
