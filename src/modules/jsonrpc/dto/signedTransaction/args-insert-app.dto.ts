import { IsHexadecimal, IsString, IsInt, Min, Max } from "class-validator";

export class ArgsInsertApp {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  @Max(1)
  domain: number;

  @IsString()
  appAdministrator: string;

  @IsHexadecimal()
  publicKey: string;

  @IsInt()
  @Min(0)
  @Max(2)
  status: number;

  @IsInt()
  @Min(0)
  notBefore: number;

  @IsInt()
  @Min(0)
  notAfter: number;
}

export default { ArgsInsertApp };
