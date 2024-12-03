import { IsHexadecimal, Length, Matches } from "class-validator";

import { GetSchemaRevisionParams } from "./get-schema-revisions.params.js";

export class GetSchemaRevisionMetadataParams extends GetSchemaRevisionParams {
  @IsHexadecimal()
  @Length(66, 66)
  @Matches(/^0x/, { message: "metadataId must start with 0x" })
  metadataId!: string;
}

export default GetSchemaRevisionMetadataParams;
