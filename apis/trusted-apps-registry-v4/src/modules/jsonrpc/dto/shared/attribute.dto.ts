import { IsBase64, IsHexadecimal, Matches } from "class-validator";

export class Attribute {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  hash!: string;

  @IsBase64()
  body!: string;
}

export default { Attribute };
