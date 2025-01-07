import { PaginationQuery } from "@ebsiint-api/shared";
import { IsHexadecimal, IsOptional, Length, Matches } from "class-validator";

export class GetSchemasQuery extends PaginationQuery {
  @IsHexadecimal()
  @IsOptional()
  @Length(66, 66, { message: "schema-revision-id must have 66 characters" })
  @Matches(/^0x/, { message: "schema-revision-id must start with 0x" })
  "schema-revision-id": string;
}

export default GetSchemasQuery;
