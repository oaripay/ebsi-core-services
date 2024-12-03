import { IsHexadecimal, Length, Matches } from "class-validator";

import { GetSchemaParams } from "./get-schema.params.js";

export class GetSchemaRevisionParams extends GetSchemaParams {
  @IsHexadecimal()
  @Length(66, 66)
  @Matches(/^0x/, { message: "schemaRevisionId must start with 0x" })
  schemaRevisionId!: string;
}

export default GetSchemaRevisionParams;
