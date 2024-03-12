import { IsHexadecimal, Matches } from "class-validator";
import { IsDidV1 } from "@ebsiint-api/shared";

export class ArgsDeleteAppAdministrator {
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  applicationId!: string;

  @IsDidV1()
  administratorId!: string;
}

export default { ArgsDeleteAppAdministrator };
