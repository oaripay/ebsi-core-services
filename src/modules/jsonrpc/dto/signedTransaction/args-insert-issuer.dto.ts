import { IsLowercase } from "class-validator";
import IsDid from "../../types/IsDid";
import CanBeParsedToJson from "../../types/CanBeParsedToJson";

export default class ArgsInsertIssuer {
  @IsDid()
  @IsLowercase()
  did: string;

  @CanBeParsedToJson()
  attributeData: string;
}
