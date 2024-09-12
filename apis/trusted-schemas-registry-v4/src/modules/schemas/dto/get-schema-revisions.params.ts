import { Matches, IsHexadecimal, Length } from "class-validator";
import { GetSchemaParams } from "./get-schema.params.js";

export class GetSchemaRevisionParams extends GetSchemaParams {
  @Matches(/^0x/, { message: "schemaRevisionId must start with 0x" })
  @IsHexadecimal()
  @Length(66, 66)
  schemaRevisionId!: string;
}

export default GetSchemaRevisionParams;
