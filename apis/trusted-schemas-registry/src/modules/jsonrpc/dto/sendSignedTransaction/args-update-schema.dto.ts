import { IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators/index.js";

export class ArgsUpdateSchema {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaId!: string;

  @IsHexadecimalJSON()
  schema!: string;

  @IsHexadecimalJSON()
  metadata!: string;
}

export default { ArgsUpdateSchema };
