import { Matches, IsHexadecimal, Length } from "class-validator";
import { GetSchemaRevisionParams } from "./get-schema-revisions.params.js";

export class GetSchemaRevisionMetadataParams extends GetSchemaRevisionParams {
  @Matches(/^0x/, { message: "metadataId must start with 0x" })
  @IsHexadecimal()
  @Length(66, 66)
  metadataId!: string;
}

export default GetSchemaRevisionMetadataParams;
