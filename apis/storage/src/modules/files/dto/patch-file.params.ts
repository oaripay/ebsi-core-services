import { IsString, IsHexadecimal } from "class-validator";

export class PatchFileParams {
  @IsString()
  @IsHexadecimal()
  hash!: string;
}

export default PatchFileParams;
