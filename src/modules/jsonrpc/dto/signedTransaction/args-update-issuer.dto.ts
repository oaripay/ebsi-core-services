import { IsLowercase, IsHexadecimal, IsOptional } from "class-validator";
import IsDid from "../../validators/IsDid";

export class ArgsUpdateIssuer {
  @IsDid()
  @IsLowercase()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default ArgsUpdateIssuer;
