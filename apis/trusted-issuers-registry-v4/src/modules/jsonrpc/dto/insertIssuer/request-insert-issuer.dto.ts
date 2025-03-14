import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.ts";
import { InsertIssuerParam } from "./insert-issuer-param.dto.ts";

export class RequestInsertIssuerDto extends JsonRpcDto {
  @Equals("insertIssuer")
  declare method: "insertIssuer";

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(1)
  @Type(() => InsertIssuerParam)
  declare params: InsertIssuerParam[];
}
