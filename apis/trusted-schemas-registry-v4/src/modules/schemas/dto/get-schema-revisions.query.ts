import {
  IsOptional,
  IsISO8601,
  Matches,
  IsHexadecimal,
  Length,
} from "class-validator";
import { PaginationQuery } from "@ebsiint-api/shared";

export class GetSchemaRevisionsQuery extends PaginationQuery {
  @IsOptional()
  @IsISO8601()
  "valid-at"?: string;

  @IsOptional()
  @Matches(/^0x/, { message: "metadata-id must start with 0x" })
  @IsHexadecimal()
  @Length(66, 66)
  "metadata-id": string;
}

export default GetSchemaRevisionsQuery;
