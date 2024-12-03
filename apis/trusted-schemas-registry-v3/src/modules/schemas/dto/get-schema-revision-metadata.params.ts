import { IsHexadecimal, Matches } from "class-validator";

import { GetSchemaRevisionParams } from "./get-schema-revisions.params.js";

export class GetSchemaRevisionMetadataParams extends GetSchemaRevisionParams {
  @IsHexadecimal()
  @Matches(/^0x/)
  metadataId!: string;
}

export default GetSchemaRevisionMetadataParams;
