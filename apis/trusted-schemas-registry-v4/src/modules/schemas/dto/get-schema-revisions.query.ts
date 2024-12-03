import { PaginationQuery } from "@ebsiint-api/shared";
import {
  IsHexadecimal,
  IsISO8601,
  IsOptional,
  Length,
  Matches,
} from "class-validator";

export class GetSchemaRevisionsQuery extends PaginationQuery {
  @IsHexadecimal()
  @IsOptional()
  @Length(66, 66)
  @Matches(/^0x/, { message: "metadata-id must start with 0x" })
  "metadata-id": string;

  @IsISO8601()
  @IsOptional()
  "valid-at"?: string;
}

export default GetSchemaRevisionsQuery;
