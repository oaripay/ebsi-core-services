import { IsBase64, IsHexadecimal } from "class-validator";

export class Attribute {
  @IsHexadecimal()
  hash!: string;

  @IsBase64()
  body!: string;
}

export default { Attribute };
