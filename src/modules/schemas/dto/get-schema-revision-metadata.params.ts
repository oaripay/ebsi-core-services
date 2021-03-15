import { Matches, IsHexadecimal } from "class-validator";
import { GetSchemaRevisionParams } from "./get-schema-revisions.params";

export class GetSchemaRevisionMetadataParams extends GetSchemaRevisionParams {
  @Matches(/^0x/)
  @IsHexadecimal()
  metadataId: string;
}

export default GetSchemaRevisionMetadataParams;
