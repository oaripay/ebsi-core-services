import { PaginationQuery } from "@ebsiint-api/shared";
import { IsHexadecimal, IsOptional, Length, Matches } from "class-validator";

export class GetSchemasQuery extends PaginationQuery {
  @IsOptional()
  @Matches(/^0x/, { message: "schema-revision-id must start with 0x" })
  @IsHexadecimal()
  @Length(66, 66)
  "schema-revision-id": string;
}

export default GetSchemasQuery;
