import { IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsInsertSchema {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaId!: string;

  @IsHexadecimalJSON()
  schema!: string;

  @IsHexadecimalJSON()
  metadata!: string;
}

export default { ArgsInsertSchema };
