import { IsHexadecimal, Matches } from "class-validator";
import { IsHexadecimalJSON } from "../../validators";

export class ArgsUpdateMetadata {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaRevisionId: string;

  @Matches(/^0x/)
  @IsHexadecimalJSON()
  metadata: string;
}

export default { ArgsUpdateMetadata };
