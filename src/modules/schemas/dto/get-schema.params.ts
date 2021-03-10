import { Matches, IsHexadecimal } from "class-validator";

export class GetSchemaParams {
  @Matches(/^0x/)
  @IsHexadecimal()
  schemaId: string; // DOI or OID
}

export default GetSchemaParams;
