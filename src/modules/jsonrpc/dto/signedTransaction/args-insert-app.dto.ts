import { IsHexadecimal, IsString, IsInt } from "class-validator";

export class ArgsInsertApp {
  @IsString()
  name: string;

  @IsInt()
  domain: number;

  @IsString()
  administrator: string;

  @IsHexadecimal()
  publicKey: string;

  @IsInt()
  status: number;

  @IsInt()
  notBefore: number;

  @IsInt()
  notAfter: number;
}

export default { ArgsInsertApp };
