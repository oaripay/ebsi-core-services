import { IsHexadecimal, Matches } from "class-validator";

export class AttributeHashDto {
  @Matches(/^0x/)
  @IsHexadecimal()
  hash: string;
}

export default AttributeHashDto;
