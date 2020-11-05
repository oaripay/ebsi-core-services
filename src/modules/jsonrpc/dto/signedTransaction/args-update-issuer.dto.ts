import { IsLowercase, IsHexadecimal, IsOptional } from "class-validator";
import IsDid from "../../types/IsDid";

export default class ArgsUpdateIssuer {
  @IsDid()
  @IsLowercase()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}
