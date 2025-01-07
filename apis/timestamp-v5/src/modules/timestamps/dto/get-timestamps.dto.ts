import { PaginationQuery } from "@ebsiint-api/shared";
import {
  IsHexadecimal,
  IsNumberString,
  IsOptional,
  Matches,
} from "class-validator";

export class GetTimestampsDto extends PaginationQuery {
  @IsOptional()
  @IsHexadecimal()
  @Matches(/^0x/, { message: "must start with 0x" })
  creator?: string;

  @IsOptional()
  @IsNumberString({ no_symbols: true })
  "hash-algorithm-id"?: string;
}

export default GetTimestampsDto;
