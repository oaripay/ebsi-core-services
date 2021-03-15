import { Matches, IsHexadecimal } from "class-validator";
import { GetSchemaParams } from "./get-schema.params";

export class GetSchemaRevisionParams extends GetSchemaParams {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaRevisionId: string;
}

export default GetSchemaRevisionParams;
