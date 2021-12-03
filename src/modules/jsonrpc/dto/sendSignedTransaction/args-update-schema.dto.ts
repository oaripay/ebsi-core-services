import { IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsUpdateSchema {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaId: string;

  @Matches(/^0x/)
  @IsHexadecimalJSON()
  schema: string;

  @Matches(/^0x/)
  @IsHexadecimalJSON()
  metadata: string;
}

export default { ArgsUpdateSchema };
