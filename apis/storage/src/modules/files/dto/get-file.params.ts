import { IsString, IsHexadecimal } from "class-validator";

export class GetFileParams {
  @IsString()
  @IsHexadecimal()
  hash!: string;
}

export default GetFileParams;
