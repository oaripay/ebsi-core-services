import { IsHexadecimal, Matches } from "class-validator";

import { GetSchemaParams } from "./get-schema.params.js";

export class GetSchemaRevisionParams extends GetSchemaParams {
  @IsHexadecimal()
  @Matches(/^0x/)
  schemaRevisionId!: string;
}

export default GetSchemaRevisionParams;
