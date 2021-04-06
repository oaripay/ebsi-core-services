import { IsHexadecimal } from "class-validator";

export class AttributeHashDto {
  @IsHexadecimal()
  hash: string;
}

export default AttributeHashDto;
