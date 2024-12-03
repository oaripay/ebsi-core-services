import { IsDidV1 } from "@ebsiint-api/shared";
import { IsHexadecimal, Matches } from "class-validator";

export class ArgsSetAttributeData {
  @IsDidV1()
  did!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  attributeId!: string;

  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  attributeData!: string;
}

export default ArgsSetAttributeData;
