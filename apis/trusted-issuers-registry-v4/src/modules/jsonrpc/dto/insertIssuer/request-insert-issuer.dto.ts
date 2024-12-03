import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  ValidateNested,
} from "class-validator";

import { JsonRpcDto } from "../jsonrpc.dto.js";
import { InsertIssuerParam } from "./insert-issuer-param.dto.js";

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

export default RequestInsertIssuerDto;
