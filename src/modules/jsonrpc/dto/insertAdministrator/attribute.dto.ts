import { IsBase64, IsHexadecimal } from "class-validator";

export default class Attribute {
  @IsHexadecimal()
  hash: string;

  @IsBase64()
  body: string;
}
