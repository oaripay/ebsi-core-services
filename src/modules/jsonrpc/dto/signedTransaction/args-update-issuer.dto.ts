import { IsHexadecimal, IsOptional } from "class-validator";
import IsDid from "../../validators/IsDid";

export class ArgsUpdateIssuer {
  @IsDid()
  did: string;

  @IsHexadecimal()
  attributeData: string;

  @IsOptional()
  @IsHexadecimal()
  prevAttributeHash: string;
}

export default ArgsUpdateIssuer;
