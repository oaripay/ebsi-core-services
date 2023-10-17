import { IsString, IsInt, Min, Max } from "class-validator";

export class ArgsInsertApp {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  @Max(2)
  domain!: number;

  @IsString()
  appAdministrator!: string;
}

export default { ArgsInsertApp };
