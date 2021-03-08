import { Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsInsertSchema {
  @Matches(/^0x/)
  @IsHexadecimalJSON()
  schema: string;

  @Matches(/^0x/)
  @IsHexadecimalJSON()
  metadata: string;
}

export default { ArgsInsertSchema };
