import { IsHexadecimal } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsSetAttributeData {
  @IsDidV1()
  did!: string;

  @IsHexadecimal()
  attributeId!: string;

  @IsHexadecimal()
  attributeData!: string;
}

export default ArgsSetAttributeData;
