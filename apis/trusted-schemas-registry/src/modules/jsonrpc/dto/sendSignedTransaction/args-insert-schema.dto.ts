import { IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsInsertSchema {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaId!: string;

  @Matches(/^0x/)
  @IsHexadecimalJSON()
  schema!: string;

  @Matches(/^0x/)
  @IsHexadecimalJSON()
  metadata!: string;
}

export default { ArgsInsertSchema };
