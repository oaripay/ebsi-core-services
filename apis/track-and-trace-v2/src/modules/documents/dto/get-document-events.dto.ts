import { PaginationQuery } from "@ebsiint-api/shared";
import { IsHexadecimal, IsIn, IsOptional, IsString } from "class-validator";

export class GetDocumentEventsDto extends PaginationQuery {
  @IsOptional()
  @IsHexadecimal()
  "external-hash"?: string;

  @IsOptional()
  @IsIn(["block", "external"])
  source?: "block" | "external";

  @IsOptional()
  @IsString()
  sender?: string;

  @IsOptional()
  @IsString()
  origin?: string;
}

export default GetDocumentEventsDto;
