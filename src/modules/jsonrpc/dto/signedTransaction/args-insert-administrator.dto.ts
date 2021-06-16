import { IsHexadecimal } from "class-validator";
import IsDid from "../../validators/IsDid";

export class ArgsInsertAdministrator {
  @IsDid()
  did: string;

  @IsHexadecimal()
  attributeData: string;
}

export default ArgsInsertAdministrator;
